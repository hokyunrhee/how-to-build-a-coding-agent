import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as readline from "node:readline";
import { parseArgs } from "node:util";
import { z } from "zod";

const MODEL = "claude-opus-5-5";

async function main() {
  const { values } = parseArgs({
    options: { verbose: { type: "boolean", default: false } },
  });
  const verbose = values.verbose;

  if (verbose) {
    logToStderr = true;
    log("Verbose logging enabled");
  }

  const client = new Anthropic();
  if (verbose) {
    log("Anthropic client initialized");
  }

  const lines = readline
    .createInterface({ input: process.stdin })
    [Symbol.asyncIterator]();
  const getUserMessage = async (): Promise<string | null> => {
    const { value, done } = await lines.next();
    return done ? null : value;
  };

  const tools: ToolDefinition[] = [
    ReadFileDefinition,
    ListFilesDefinition,
    BashDefinition,
    EditFileDefinition,
  ];
  if (verbose) {
    log(`Initialized ${tools.length} tools`);
  }
  const agent = new Agent(client, getUserMessage, tools, verbose);
  try {
    await agent.run();
  } catch (err) {
    console.log(`Error: ${err instanceof Error ? err.message : err}`);
  }
}

class Agent {
  client: Anthropic;
  getUserMessage: () => Promise<string | null>;
  tools: ToolDefinition[];
  verbose: boolean;

  constructor(
    client: Anthropic,
    getUserMessage: () => Promise<string | null>,
    tools: ToolDefinition[],
    verbose: boolean,
  ) {
    this.client = client;
    this.getUserMessage = getUserMessage;
    this.tools = tools;
    this.verbose = verbose;
  }

  async run(): Promise<void> {
    const conversation: Anthropic.MessageParam[] = [];

    if (this.verbose) {
      log("Starting chat session with tools enabled");
    }
    console.log("Chat with Claude (use 'ctrl-c' to quit)");

    while (true) {
      process.stdout.write("\u001b[94mYou\u001b[0m: ");
      const userInput = await this.getUserMessage();
      if (userInput === null) {
        if (this.verbose) {
          log("User input ended, breaking from chat loop");
        }
        break;
      }

      // Skip empty messages
      if (userInput === "") {
        if (this.verbose) {
          log("Skipping empty message");
        }
        continue;
      }

      if (this.verbose) {
        log(`User input received: ${JSON.stringify(userInput)}`);
      }

      const userMessage: Anthropic.MessageParam = {
        role: "user",
        content: [{ type: "text", text: userInput }],
      };
      conversation.push(userMessage);

      if (this.verbose) {
        log(
          `Sending message to Claude, conversation length: ${conversation.length}`,
        );
      }

      let message: Anthropic.Message;
      try {
        message = await this.runInference(conversation);
      } catch (err) {
        if (this.verbose) {
          log(`Error during inference: ${err}`);
        }
        throw err;
      }
      conversation.push({ role: "assistant", content: message.content });

      // Keep processing until Claude stops using tools
      while (true) {
        // Collect all tool uses and their results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        let hasToolUse = false;

        if (this.verbose) {
          log(
            `Processing ${message.content.length} content blocks from Claude`,
          );
        }

        for (const content of message.content) {
          switch (content.type) {
            case "text":
              console.log(`\u001b[93mClaude\u001b[0m: ${content.text}`);
              break;
            case "tool_use": {
              hasToolUse = true;
              const input = JSON.stringify(content.input);
              if (this.verbose) {
                log(`Tool use detected: ${content.name} with input: ${input}`);
              }
              console.log(`\u001b[96mtool\u001b[0m: ${content.name}(${input})`);

              // Find and execute the tool
              let toolResult = "";
              let toolError: Error | undefined;
              const tool = this.tools.find((t) => t.name === content.name);
              if (tool) {
                if (this.verbose) {
                  log(`Executing tool: ${tool.name}`);
                }
                try {
                  toolResult = await tool.function(content.input);
                } catch (err) {
                  toolError =
                    err instanceof Error ? err : new Error(String(err));
                }
                console.log(`\u001b[92mresult\u001b[0m: ${toolResult}`);
                if (toolError) {
                  console.log(`\u001b[91merror\u001b[0m: ${toolError.message}`);
                }
                if (this.verbose) {
                  if (toolError) {
                    log(`Tool execution failed: ${toolError.message}`);
                  } else {
                    log(
                      `Tool execution successful, result length: ${toolResult.length} chars`,
                    );
                  }
                }
              } else {
                toolError = new Error(`tool '${content.name}' not found`);
                console.log(`\u001b[91merror\u001b[0m: ${toolError.message}`);
              }

              // Add tool result to collection
              toolResults.push({
                type: "tool_result",
                tool_use_id: content.id,
                content: toolError ? toolError.message : toolResult,
                is_error: toolError !== undefined,
              });
              break;
            }
          }
        }

        // If there were no tool uses, we're done
        if (!hasToolUse) {
          break;
        }

        // Send all tool results back and get Claude's response
        if (this.verbose) {
          log(`Sending ${toolResults.length} tool results back to Claude`);
        }
        conversation.push({ role: "user", content: toolResults });

        // Get Claude's response after tool execution
        try {
          message = await this.runInference(conversation);
        } catch (err) {
          if (this.verbose) {
            log(`Error during followup inference: ${err}`);
          }
          throw err;
        }
        conversation.push({ role: "assistant", content: message.content });

        if (this.verbose) {
          log(
            `Received followup response with ${message.content.length} content blocks`,
          );
        }

        // Continue loop to process the new message
      }
    }

    if (this.verbose) {
      log("Chat session ended");
    }
  }

  async runInference(
    conversation: Anthropic.MessageParam[],
  ): Promise<Anthropic.Message> {
    const anthropicTools: Anthropic.Tool[] = this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    if (this.verbose) {
      log(
        `Making API call to Claude with model: ${MODEL} and ${anthropicTools.length} tools`,
      );
    }

    try {
      const message = await this.client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        messages: conversation,
        tools: anthropicTools,
      });
      if (this.verbose) {
        log("API call successful, response received");
      }
      return message;
    } catch (err) {
      if (this.verbose) {
        log(`API call failed: ${err}`);
      }
      throw err;
    }
  }
}

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool.InputSchema;
  function: (input: unknown) => Promise<string>;
};

const ReadFileInput = z.object({
  path: z
    .string()
    .describe("The relative path of a file in the working directory."),
});

const ReadFileInputSchema = generateSchema(ReadFileInput);

const ReadFileDefinition: ToolDefinition = {
  name: "read_file",
  description:
    "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.",
  inputSchema: ReadFileInputSchema,
  function: readFile,
};

async function readFile(input: unknown): Promise<string> {
  const readFileInput = ReadFileInput.parse(input);

  log(`Reading file: ${readFileInput.path}`);
  let content: Buffer;
  try {
    content = await fs.readFile(readFileInput.path);
  } catch (err) {
    log(`Failed to read file ${readFileInput.path}: ${err}`);
    throw err;
  }
  log(`Successfully read file ${readFileInput.path} (${content.length} bytes)`);
  return content.toString();
}

const ListFilesInput = z.object({
  path: z
    .string()
    .optional()
    .describe(
      "Optional relative path to list files from. Defaults to current directory if not provided.",
    ),
});

const ListFilesInputSchema = generateSchema(ListFilesInput);

const ListFilesDefinition: ToolDefinition = {
  name: "list_files",
  description:
    "List files and directories at a given path. If no path is provided, lists files in the current directory.",
  inputSchema: ListFilesInputSchema,
  function: listFiles,
};

async function listFiles(input: unknown): Promise<string> {
  const listFilesInput = ListFilesInput.parse(input);

  let dir = ".";
  if (listFilesInput.path) {
    dir = listFilesInput.path;
  }

  log(`Listing files in directory: ${dir}`);

  const files: string[] = [];
  try {
    await walk(dir, ".", files);
  } catch (err) {
    log(`Failed to list files in ${dir}: ${err}`);
    throw err;
  }

  log(`Successfully listed ${files.length} files in ${dir}`);

  return JSON.stringify(files);
}

// Collects every path under root into files, relative to root.
// Directories get a trailing slash.
async function walk(root: string, relDir: string, files: string[]) {
  const entries = await fs.readdir(path.join(root, relDir), {
    withFileTypes: true,
  });
  entries.sort((a, b) => (a.name < b.name ? -1 : 1));

  for (const entry of entries) {
    const relPath = path.join(relDir, entry.name);
    if (entry.isDirectory()) {
      // Skip .devenv and node_modules directories and their contents
      if (relPath === ".devenv" || relPath === "node_modules") {
        continue;
      }
      files.push(relPath + "/");
      await walk(root, relPath, files);
    } else {
      files.push(relPath);
    }
  }
}

const BashInput = z.object({
  command: z.string().describe("The bash command to execute."),
});

const BashInputSchema = generateSchema(BashInput);

const BashDefinition: ToolDefinition = {
  name: "bash",
  description:
    "Execute a bash command and return its output. Use this to run shell commands.",
  inputSchema: BashInputSchema,
  function: bash,
};

async function bash(input: unknown): Promise<string> {
  const bashInput = BashInput.parse(input);

  log(`Executing bash command: ${bashInput.command}`);
  const { output, error } = await runCommand("bash", ["-c", bashInput.command]);
  if (error) {
    log(`Bash command failed: ${error}`);
    return `Command failed with error: ${error}\nOutput: ${output}`;
  }

  log(
    `Bash command executed successfully, output length: ${Buffer.byteLength(output)} chars`,
  );
  return output.trim();
}

type CommandResult = {
  stdout: string; // what the command wrote to stdout
  output: string; // stdout and stderr together, in the order they were written
  exitCode: number | null; // null if the command never ran or was killed
  error?: string; // why the command failed, if it did
};

// Runs a command until it exits. Its stdin is empty, so a command that
// waits for input gets end-of-file instead of hanging the agent.
function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    let stdout = "";
    let output = "";
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      output += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      output += chunk;
    });

    child.on("error", (err) => {
      resolve({ stdout, output, exitCode: null, error: err.message });
    });
    child.on("close", (exitCode, signal) => {
      let error: string | undefined;
      if (signal) {
        error = `signal: ${signal}`;
      } else if (exitCode !== 0) {
        error = `exit status ${exitCode}`;
      }
      resolve({ stdout, output, exitCode, error });
    });
  });
}

const EditFileInput = z.object({
  path: z.string().describe("The path to the file"),
  old_str: z
    .string()
    .describe(
      "Text to search for - must match exactly and must only have one match exactly",
    ),
  new_str: z.string().describe("Text to replace old_str with"),
});

const EditFileInputSchema = generateSchema(EditFileInput);

const EditFileDefinition: ToolDefinition = {
  name: "edit_file",
  description: `Make edits to a text file.

Replaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST be different from each other.

If the file specified with path doesn't exist, it will be created.
`,
  inputSchema: EditFileInputSchema,
  function: editFile,
};

async function editFile(input: unknown): Promise<string> {
  const editFileInput = EditFileInput.parse(input);

  if (
    editFileInput.path === "" ||
    editFileInput.old_str === editFileInput.new_str
  ) {
    log("EditFile failed: invalid input parameters");
    throw new Error("invalid input parameters");
  }

  log(
    `Editing file: ${editFileInput.path} (replacing ${Buffer.byteLength(editFileInput.old_str)} chars with ${Buffer.byteLength(editFileInput.new_str)} chars)`,
  );
  let oldContent: string;
  try {
    oldContent = await fs.readFile(editFileInput.path, "utf8");
  } catch (err) {
    const notExist = (err as NodeJS.ErrnoException).code === "ENOENT";
    if (notExist && editFileInput.old_str === "") {
      log(`File does not exist, creating new file: ${editFileInput.path}`);
      return createNewFile(editFileInput.path, editFileInput.new_str);
    }
    log(`Failed to read file ${editFileInput.path}: ${err}`);
    throw err;
  }

  // Special case: if old_str is empty, we're appending to the file
  let newContent: string;
  if (editFileInput.old_str === "") {
    newContent = oldContent + editFileInput.new_str;
  } else {
    // Count occurrences first to ensure we have exactly one match
    const count = oldContent.split(editFileInput.old_str).length - 1;
    if (count === 0) {
      log(`EditFile failed: old_str not found in file ${editFileInput.path}`);
      throw new Error("old_str not found in file");
    }
    if (count > 1) {
      log(
        `EditFile failed: old_str found ${count} times in file ${editFileInput.path}, must be unique`,
      );
      throw new Error(`old_str found ${count} times in file, must be unique`);
    }

    // A replacer function keeps "$" patterns in new_str from being expanded
    newContent = oldContent.replace(
      editFileInput.old_str,
      () => editFileInput.new_str,
    );
  }

  try {
    await fs.writeFile(editFileInput.path, newContent);
  } catch (err) {
    log(`Failed to write file ${editFileInput.path}: ${err}`);
    throw err;
  }

  log(`Successfully edited file ${editFileInput.path}`);
  return "OK";
}

async function createNewFile(
  filePath: string,
  content: string,
): Promise<string> {
  log(`Creating new file: ${filePath} (${Buffer.byteLength(content)} bytes)`);
  const dir = path.dirname(filePath);
  if (dir !== ".") {
    log(`Creating directory: ${dir}`);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      log(`Failed to create directory ${dir}: ${err}`);
      throw new Error(`failed to create directory: ${(err as Error).message}`);
    }
  }

  try {
    await fs.writeFile(filePath, content);
  } catch (err) {
    log(`Failed to create file ${filePath}: ${err}`);
    throw new Error(`failed to create file: ${(err as Error).message}`);
  }

  log(`Successfully created file ${filePath}`);
  return `Successfully created file ${filePath}`;
}

function generateSchema(schema: z.ZodObject): Anthropic.Tool.InputSchema {
  const jsonSchema = z.toJSONSchema(schema);

  return {
    type: "object",
    properties: jsonSchema.properties,
  };
}

// In verbose mode, log lines go to stderr with a timestamp.
// Otherwise they go to stdout as-is.
let logToStderr = false;

function log(message: string) {
  if (logToStderr) {
    console.error(`${new Date().toISOString()} ${message}`);
  } else {
    console.log(message);
  }
}

main();

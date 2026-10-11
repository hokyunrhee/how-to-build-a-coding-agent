import Anthropic from "@anthropic-ai/sdk";
import * as readline from "node:readline";
import { parseArgs } from "node:util";

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

  const agent = new Agent(client, getUserMessage, verbose);
  try {
    await agent.run();
  } catch (err) {
    console.log(`Error: ${err instanceof Error ? err.message : err}`);
  }
}

class Agent {
  client: Anthropic;
  getUserMessage: () => Promise<string | null>;
  verbose: boolean;

  constructor(
    client: Anthropic,
    getUserMessage: () => Promise<string | null>,
    verbose: boolean,
  ) {
    this.client = client;
    this.getUserMessage = getUserMessage;
    this.verbose = verbose;
  }

  async run(): Promise<void> {
    const conversation: Anthropic.MessageParam[] = [];

    if (this.verbose) {
      log("Starting chat session");
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

      if (this.verbose) {
        log(
          `Received response from Claude with ${message.content.length} content blocks`,
        );
      }

      for (const content of message.content) {
        switch (content.type) {
          case "text":
            console.log(`\u001b[93mClaude\u001b[0m: ${content.text}`);
            break;
        }
      }
    }

    if (this.verbose) {
      log("Chat session ended");
    }
  }

  async runInference(
    conversation: Anthropic.MessageParam[],
  ): Promise<Anthropic.Message> {
    if (this.verbose) {
      log(`Making API call to Claude with model: ${MODEL}`);
    }

    try {
      const message = await this.client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        messages: conversation,
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

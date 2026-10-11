# 🧠 Build Your Own Coding Agent via a Step-by-Step Workshop

Welcome! 👋 This workshop will guide you through building your own **AI-powered coding assistant** — starting from a basic chatbot, and adding powerful tools like file reading, shell command execution, and code searching.

You don’t need to be an AI expert. Just follow along and build step-by-step!

🌐 **Want a detailed overview?** Check out the blog post: [ghuntley.com/agent](https://ghuntley.com/agent/)

> 🟦 **TypeScript edition.** This is a TypeScript port of [ghuntley/how-to-build-a-coding-agent](https://github.com/ghuntley/how-to-build-a-coding-agent) (written in Go). Only the language changed — the concepts, the six agents you build and the learning goals are the same.

---

## 🎯 What You'll Learn

By the end of this workshop, you’ll understand how to:

- ✅ Connect to the Anthropic Claude API
- ✅ Build a simple AI chatbot
- ✅ Add tools like reading files, editing code, and running commands
- ✅ Handle tool requests and errors
- ✅ Build an agent that gets smarter with each step

---

## 🛠️ What We're Building

You’ll build 6 versions of a coding assistant. 

Each version adds more features:

1. **Basic Chat** — talk to Claude
2. **File Reader** — read code files
3. **File Explorer** — list files in folders
4. **Command Runner** — run shell commands
5. **File Editor** — modify files
6. **Code Search** — search your codebase with patterns

```mermaid
graph LR
    subgraph "Application Progression"
        A[chat.ts<br/>Basic Chat] --> B[read.ts<br/>+ File Reading]
        B --> C[list_files.ts<br/>+ Directory Listing]
        C --> D[bash_tool.ts<br/>+ Shell Commands]
        D --> E[edit_tool.ts<br/>+ File Editing]
        E --> F[code_search_tool.ts<br/>+ Code Search]
    end
    
    subgraph "Tool Capabilities"
        G[No Tools] --> H[read_file]
        H --> I[read_file<br/>list_files]
        I --> J[read_file<br/>list_files<br/>bash]
        J --> K[read_file<br/>list_files<br/>bash<br/>edit_file]
        K --> L[read_file<br/>list_files<br/>bash<br/>code_search]
    end
    
    A -.-> G
    B -.-> H
    C -.-> I
    D -.-> J
    E -.-> K
    F -.-> L
```

At the end, you’ll end up with a powerful local developer assistant!



---

## 🧱 How It Works (Architecture)

Each agent works like this:

1. Waits for your input
2. Sends it to Claude
3. Claude may respond directly or ask to use a tool
4. The agent runs the tool (e.g., read a file)
5. Sends the result back to Claude
6. Claude gives you the final answer

We call this the **event loop** — it's like the agent's heartbeat.

```mermaid
graph TB
    subgraph "Agent Architecture"
        A[Agent] --> B[Anthropic Client]
        A --> C[Tool Registry]
        A --> D[getUserMessage Function]
        A --> E[Verbose Logging]
    end
    
    subgraph "Shared Event Loop"
        F[Start Chat Session] --> G[Get User Input]
        G --> H{Empty Input?}
        H -->|Yes| G
        H -->|No| I[Add to Conversation]
        I --> J[runInference]
        J --> K[Claude Response]
        K --> L{Tool Use?}
        L -->|No| M[Display Text]
        L -->|Yes| N[Execute Tools]
        N --> O[Collect Results]
        O --> P[Send Results to Claude]
        P --> J
        M --> G
    end
    
    subgraph "Tool Execution Loop"
        N --> Q[Find Tool by Name]
        Q --> R[Execute Tool Function]
        R --> S[Capture Result/Error]
        S --> T[Add to Tool Results]
        T --> U{More Tools?}
        U -->|Yes| Q
        U -->|No| O
    end
```

## 🚀 Getting Started

### ✅ Prerequisites

* Node.js 22+ or [devenv](https://devenv.sh/) (recommended for easy setup)
* An [Anthropic API Key](https://platform.claude.com/settings/keys)

### 🔧 Set Up Your Environment

**Option 1: Recommended (using devenv)**

```bash
devenv shell  # Loads everything you need
```

**Option 2: Manual setup**

```bash
# Make sure Node.js is installed
npm install
```

### 🔐 Add Your API Key

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

---

## 🏁 Start with the Basics

### 1. `chat.ts` — Basic Chat

A simple chatbot that talks to Claude.

```bash
npx tsx chat.ts
```

* ➡️ Try: “Hello!”
* ➡️ Add `--verbose` to see detailed logs

> 💡 [`tsx`](https://tsx.is) runs a TypeScript file directly, with no build step. On Node.js 22.18+ `node chat.ts` works too.

---

## 🛠️ Add Tools (One Step at a Time)

### 2. `read.ts` — Read Files

Now Claude can read files from your computer.

```bash
npx tsx read.ts
```

* ➡️ Try: “Read fizzbuzz.js”

---

### 3. `list_files.ts` — Explore Folders

Lets Claude look around your directory.

```bash
npx tsx list_files.ts
```

* ➡️ Try: “List all files in this folder”
* ➡️ Try: “What’s in fizzbuzz.js?”

---

### 4. `bash_tool.ts` — Run Shell Commands

Allows Claude to run safe terminal commands.

```bash
npx tsx bash_tool.ts
```

* ➡️ Try: “Run git status”
* ➡️ Try: “List all .ts files using bash”

---

### 5. `edit_tool.ts` — Edit Files

Claude can now **modify code**, create files, and make changes.

```bash
npx tsx edit_tool.ts
```

* ➡️ Try: “Create a Python hello world script”
* ➡️ Try: “Add a comment to the top of fizzbuzz.js”

---

### 6. `code_search_tool.ts` — Search Code

Use pattern search (powered by [ripgrep](https://github.com/BurntSushi/ripgrep)).

```bash
npx tsx code_search_tool.ts
```

* ➡️ Try: “Find all function definitions in TypeScript files”
* ➡️ Try: “Search for TODO comments”

---

## 🧪 Sample Files (Already Included)

1. `fizzbuzz.js`: for file reading and editing
1. `riddle.txt`: a fun text file to explore
1. `AGENT.md`: info about the project environment

---

## 🐞 Troubleshooting

**API key not working?**

* Make sure it’s exported: `echo $ANTHROPIC_API_KEY`
* Check your quota on [Anthropic’s dashboard](https://www.anthropic.com)

**TypeScript errors?**

* Run `npm install`
* Make sure you’re using Node.js 22 or later
* Run `npm run check` to typecheck every step

**Tool errors?**

* Use `--verbose` for full error logs
* Check file paths and permissions

**Environment issues?**

* Use `devenv shell` to avoid config problems

---

## 💡 How Tools Work (Under the Hood)

Tools are like plugins. You define:

* **Name** (e.g., `read_file`)
* **Input Schema** (what info it needs)
* **Function** (what it does)

Example tool definition in TypeScript:

```typescript
const ReadFileDefinition: ToolDefinition = {
  name: "read_file",
  description: "Reads the contents of a file",
  inputSchema: generateSchema(ReadFileInput),
  function: readFile,
};
```

Schema generation uses [Zod](https://zod.dev) schemas — so it’s easy to define and reuse.

---

## 🧭 Workshop Path: Learn by Building

| Phase | What to Focus On                                 |
| ----- | ------------------------------------------------ |
| **1** | `chat.ts`: API integration and response handling |
| **2** | `read.ts`: Tool system, schema generation        |
| **3** | `list_files.ts`: Multiple tools, file system     |
| **4** | `bash_tool.ts`: Shell execution, error capture   |
| **5** | `edit_tool.ts`: File editing, safety checks      |
| **6** | `code_search_tool.ts`: Pattern search, ripgrep   |

---

## 🛠️ Developer Environment (Optional)

If you use [`devenv`](https://devenv.sh/), it gives you:

* Node.js, TypeScript, Python, Rust, .NET
* Git and other dev tools

```bash
devenv shell   # Load everything
devenv test    # Run checks
hello          # Greeting script
```

---

## 🚀 What's Next?

Once you complete the workshop, try building:

* Custom tools (e.g., API caller, web scraper)
* Tool chains (run tools in a sequence)
* Memory features (remember things across sessions)
* A web UI for your agent
* Integration with other AI models

---

## 📦 Summary

This workshop helps you:

* Understand agent architecture
* Learn to build smart assistants
* Grow capabilities step-by-step
* Practice using Claude and TypeScript together

---

Have fun exploring and building your own AI-powered tools! 💻✨

If you have questions or ideas, feel free to fork the repo, open issues, or connect with the community!

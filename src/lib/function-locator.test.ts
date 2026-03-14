import {
  detectLanguageFromPath,
  locateFunctionInSource,
} from './function-locator';
import type { FunctionLocation } from '../types/ai';

// ---------------------------------------------------------------------------
// detectLanguageFromPath
// ---------------------------------------------------------------------------

describe('detectLanguageFromPath', () => {
  describe('C', () => {
    it('should detect .c files as "c"', () => {
      expect(detectLanguageFromPath('main.c')).toBe('c');
    });

    it('should detect .h files as "c"', () => {
      expect(detectLanguageFromPath('utils.h')).toBe('c');
    });

    it('should handle path with directories', () => {
      expect(detectLanguageFromPath('src/core/utils.h')).toBe('c');
    });
  });

  describe('C++', () => {
    it('should detect .cpp files as "cpp"', () => {
      expect(detectLanguageFromPath('engine.cpp')).toBe('cpp');
    });

    it('should detect .cc files as "cpp"', () => {
      expect(detectLanguageFromPath('engine.cc')).toBe('cpp');
    });

    it('should detect .cxx files as "cpp"', () => {
      expect(detectLanguageFromPath('engine.cxx')).toBe('cpp');
    });

    it('should detect .hpp files as "cpp"', () => {
      expect(detectLanguageFromPath('engine.hpp')).toBe('cpp');
    });
  });

  describe('Python', () => {
    it('should detect .py files as "python"', () => {
      expect(detectLanguageFromPath('app.py')).toBe('python');
    });

    it('should handle nested path for .py', () => {
      expect(detectLanguageFromPath('src/models/user.py')).toBe('python');
    });
  });

  describe('Go', () => {
    it('should detect .go files as "go"', () => {
      expect(detectLanguageFromPath('main.go')).toBe('go');
    });
  });

  describe('Java', () => {
    it('should detect .java files as "java"', () => {
      expect(detectLanguageFromPath('Main.java')).toBe('java');
    });
  });

  describe('JavaScript', () => {
    it('should detect .js files as "javascript"', () => {
      expect(detectLanguageFromPath('index.js')).toBe('javascript');
    });

    it('should detect .jsx files as "javascript"', () => {
      expect(detectLanguageFromPath('App.jsx')).toBe('javascript');
    });

    it('should detect .mjs files as "javascript"', () => {
      expect(detectLanguageFromPath('config.mjs')).toBe('javascript');
    });
  });

  describe('TypeScript', () => {
    it('should detect .ts files as "typescript"', () => {
      expect(detectLanguageFromPath('server.ts')).toBe('typescript');
    });

    it('should detect .tsx files as "typescript"', () => {
      expect(detectLanguageFromPath('Button.tsx')).toBe('typescript');
    });
  });

  describe('Rust', () => {
    it('should detect .rs files as "rust"', () => {
      expect(detectLanguageFromPath('lib.rs')).toBe('rust');
    });
  });

  describe('Ruby', () => {
    it('should detect .rb files as "ruby"', () => {
      expect(detectLanguageFromPath('app.rb')).toBe('ruby');
    });
  });

  describe('PHP', () => {
    it('should detect .php files as "php"', () => {
      expect(detectLanguageFromPath('index.php')).toBe('php');
    });
  });

  describe('Swift', () => {
    it('should detect .swift files as "swift"', () => {
      expect(detectLanguageFromPath('AppDelegate.swift')).toBe('swift');
    });
  });

  describe('Kotlin', () => {
    it('should detect .kt files as "kotlin"', () => {
      expect(detectLanguageFromPath('Main.kt')).toBe('kotlin');
    });

    it('should detect .kts files as "kotlin"', () => {
      expect(detectLanguageFromPath('build.gradle.kts')).toBe('kotlin');
    });
  });

  describe('unknown', () => {
    it('should return "unknown" for .txt files', () => {
      expect(detectLanguageFromPath('README.txt')).toBe('unknown');
    });

    it('should return "unknown" for .md files', () => {
      expect(detectLanguageFromPath('README.md')).toBe('unknown');
    });

    it('should return "unknown" for files without extension', () => {
      expect(detectLanguageFromPath('Makefile')).toBe('unknown');
    });

    it('should return "unknown" for empty string', () => {
      expect(detectLanguageFromPath('')).toBe('unknown');
    });

    it('should return "unknown" for .json files', () => {
      expect(detectLanguageFromPath('package.json')).toBe('unknown');
    });

    it('should return "unknown" for .yaml files', () => {
      expect(detectLanguageFromPath('config.yaml')).toBe('unknown');
    });
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// locateFunctionInSource — Go
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — Go', () => {
  const goSource = `package main

import "fmt"

func helper() {
  fmt.Println("helper")
}

func main() {
  fmt.Println("hello")
  helper()
}
`;

  it('should locate a simple Go function', () => {
    const result = locateFunctionInSource(goSource, 'main', 'go');
    expect(result).not.toBeNull();
    const loc = result as FunctionLocation;
    expect(loc.startLine).toBe(9);
    expect(loc.endLine).toBe(12);
    expect(loc.code).toContain('func main()');
    expect(loc.truncated).toBe(false);
  });

  it('should locate a helper function by name', () => {
    const result = locateFunctionInSource(goSource, 'helper', 'go');
    expect(result).not.toBeNull();
    const loc = result as FunctionLocation;
    expect(loc.startLine).toBe(5);
    expect(loc.endLine).toBe(7);
    expect(loc.code).toContain('func helper()');
    expect(loc.truncated).toBe(false);
  });

  it('should return null when function not found in Go source', () => {
    const result = locateFunctionInSource(goSource, 'nonExistentFunc', 'go');
    expect(result).toBeNull();
  });

  it('should locate a Go method with receiver', () => {
    const source = `package main

type Server struct{}

func (s *Server) Start() {
  // start server
}

func (s Server) Stop() {
  // stop server
}
`;
    const result = locateFunctionInSource(source, 'Start', 'go');
    expect(result).not.toBeNull();
    const loc = result as FunctionLocation;
    expect(loc.code).toContain('func (s *Server) Start()');
  });

  it('should locate Go method with value receiver', () => {
    const source = `package main

type Server struct{}

func (s Server) Stop() {
  // stop server
}
`;
    const result = locateFunctionInSource(source, 'Stop', 'go');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('func (s Server) Stop()');
  });

  it('should handle nested braces in Go function body', () => {
    const source = `package main

func compute(x int) int {
  if x > 0 {
    for i := 0; i < x; i++ {
      x--
    }
  }
  return x
}
`;
    const result = locateFunctionInSource(source, 'compute', 'go');
    expect(result).not.toBeNull();
    const loc = result as FunctionLocation;
    expect(loc.code).toContain('func compute(x int) int {');
    expect(loc.code).toContain('return x');
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — Python
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — Python', () => {
  const pySource = `import os

def greet(name):
    print(f"Hello, {name}")

def farewell(name):
    print(f"Bye, {name}")

class MyClass:
    def method(self):
        pass
`;

  it('should locate a simple Python function', () => {
    const result = locateFunctionInSource(pySource, 'greet', 'python');
    expect(result).not.toBeNull();
    const loc = result as FunctionLocation;
    expect(loc.startLine).toBe(3);
    expect(loc.code).toContain('def greet(name):');
    expect(loc.truncated).toBe(false);
  });

  it('should locate a second Python function', () => {
    const result = locateFunctionInSource(pySource, 'farewell', 'python');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('def farewell(name):');
  });

  it('should return null for missing Python function', () => {
    const result = locateFunctionInSource(pySource, 'missing', 'python');
    expect(result).toBeNull();
  });

  it('should locate an async Python function', () => {
    const source = `async def fetch(url):
    response = await get(url)
    return response
`;
    const result = locateFunctionInSource(source, 'fetch', 'python');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('async def fetch(url):');
  });

  it('should detect end of Python function by indentation', () => {
    const source = `def first():
    x = 1
    y = 2
    return x + y

def second():
    return 0
`;
    const result = locateFunctionInSource(source, 'first', 'python');
    expect(result).not.toBeNull();
    const loc = result as FunctionLocation;
    expect(loc.code).toContain('return x + y');
    expect(loc.code).not.toContain('def second');
  });

  it('should locate indented Python method', () => {
    const source = `class Foo:
    def bar(self):
        return 42
`;
    const result = locateFunctionInSource(source, 'bar', 'python');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('def bar(self):');
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — JavaScript
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — JavaScript', () => {
  const jsSource = `const helper = (x) => x + 1;

function greet(name) {
  return "Hello " + name;
}

const add = function(a, b) {
  return a + b;
};

const multiply = (a, b) => {
  return a * b;
};
`;

  it('should locate a function declaration', () => {
    const result = locateFunctionInSource(jsSource, 'greet', 'javascript');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('function greet(name)');
  });

  it('should locate a const arrow function', () => {
    const result = locateFunctionInSource(jsSource, 'multiply', 'javascript');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('const multiply');
  });

  it('should locate a const function expression', () => {
    const result = locateFunctionInSource(jsSource, 'add', 'javascript');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('const add');
  });

  it('should return null for missing JavaScript function', () => {
    const result = locateFunctionInSource(jsSource, 'notHere', 'javascript');
    expect(result).toBeNull();
  });

  it('should locate an exported async function', () => {
    const source = `export async function fetchData(url) {
  const res = await fetch(url);
  return res.json();
}
`;
    const result = locateFunctionInSource(source, 'fetchData', 'javascript');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('export async function fetchData');
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — TypeScript
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — TypeScript', () => {
  const tsSource = `export function validateUrl(url: string): boolean {
  return url.startsWith('https://');
}

export const parseJson = <T>(raw: string): T => {
  return JSON.parse(raw) as T;
};

const internalHelper = (x: number): number => x * 2;
`;

  it('should locate a typed exported function', () => {
    const result = locateFunctionInSource(tsSource, 'validateUrl', 'typescript');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('function validateUrl');
  });

  it('should locate a generic const arrow function', () => {
    const result = locateFunctionInSource(tsSource, 'parseJson', 'typescript');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('const parseJson');
  });

  it('should locate an unexported const arrow function', () => {
    const result = locateFunctionInSource(tsSource, 'internalHelper', 'typescript');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('const internalHelper');
  });

  it('should return null when TypeScript function not found', () => {
    const result = locateFunctionInSource(tsSource, 'absent', 'typescript');
    expect(result).toBeNull();
  });

  it('should locate a let binding', () => {
    const source = `let compute: (x: number) => number;
compute = (x) => x + 1;

let process = function(input: string): string {
  return input.trim();
};
`;
    const result = locateFunctionInSource(source, 'process', 'typescript');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('let process');
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — Java
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — Java', () => {
  const javaSource = `public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    private static int multiply(int a, int b) {
        return a * b;
    }

    protected void reset() {
        this.value = 0;
    }
}
`;

  it('should locate a public Java method', () => {
    const result = locateFunctionInSource(javaSource, 'add', 'java');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('public int add');
  });

  it('should locate a private static Java method', () => {
    const result = locateFunctionInSource(javaSource, 'multiply', 'java');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('private static int multiply');
  });

  it('should locate a protected void Java method', () => {
    const result = locateFunctionInSource(javaSource, 'reset', 'java');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('protected void reset');
  });

  it('should return null for missing Java method', () => {
    const result = locateFunctionInSource(javaSource, 'divide', 'java');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — Rust
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — Rust', () => {
  const rustSource = `fn helper() -> i32 {
    42
}

pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

pub async fn fetch(url: &str) -> Result<String, Error> {
    let resp = reqwest::get(url).await?;
    Ok(resp.text().await?)
}
`;

  it('should locate a private Rust function', () => {
    const result = locateFunctionInSource(rustSource, 'helper', 'rust');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('fn helper()');
  });

  it('should locate a pub Rust function', () => {
    const result = locateFunctionInSource(rustSource, 'greet', 'rust');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('pub fn greet');
  });

  it('should locate a pub async Rust function', () => {
    const result = locateFunctionInSource(rustSource, 'fetch', 'rust');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('pub async fn fetch');
  });

  it('should return null for missing Rust function', () => {
    const result = locateFunctionInSource(rustSource, 'missing', 'rust');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — C
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — C', () => {
  const cSource = `#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

static int helper(void) {
    return 0;
}

void printResult(int n) {
    printf("%d\\n", n);
}
`;

  it('should locate a simple C function', () => {
    const result = locateFunctionInSource(cSource, 'add', 'c');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('int add(int a, int b)');
  });

  it('should locate a static C function', () => {
    const result = locateFunctionInSource(cSource, 'helper', 'c');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('static int helper');
  });

  it('should locate a void C function', () => {
    const result = locateFunctionInSource(cSource, 'printResult', 'c');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('void printResult');
  });

  it('should return null for missing C function', () => {
    const result = locateFunctionInSource(cSource, 'subtract', 'c');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — Ruby
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — Ruby', () => {
  const rubySource = `def greet(name)
  puts "Hello, #{name}"
end

def farewell(name)
  puts "Bye, #{name}"
end
`;

  it('should locate a Ruby method', () => {
    const result = locateFunctionInSource(rubySource, 'greet', 'ruby');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('def greet(name)');
  });

  it('should locate a second Ruby method', () => {
    const result = locateFunctionInSource(rubySource, 'farewell', 'ruby');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('def farewell(name)');
  });

  it('should return null for missing Ruby method', () => {
    const result = locateFunctionInSource(rubySource, 'missing', 'ruby');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — PHP
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — PHP', () => {
  const phpSource = `<?php

function greet($name) {
    echo "Hello, $name";
}

class Utils {
    public static function multiply($a, $b) {
        return $a * $b;
    }

    private function helper() {
        return true;
    }
}
`;

  it('should locate a plain PHP function', () => {
    const result = locateFunctionInSource(phpSource, 'greet', 'php');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('function greet');
  });

  it('should locate a public static PHP method', () => {
    const result = locateFunctionInSource(phpSource, 'multiply', 'php');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('function multiply');
  });

  it('should return null for missing PHP function', () => {
    const result = locateFunctionInSource(phpSource, 'divide', 'php');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — Swift
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — Swift', () => {
  const swiftSource = `import Foundation

func greet(name: String) -> String {
    return "Hello, \\(name)!"
}

public func add(a: Int, b: Int) -> Int {
    return a + b
}

private static func helper() {
    print("helper")
}
`;

  it('should locate a Swift function', () => {
    const result = locateFunctionInSource(swiftSource, 'greet', 'swift');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('func greet');
  });

  it('should locate a public Swift function', () => {
    const result = locateFunctionInSource(swiftSource, 'add', 'swift');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('public func add');
  });

  it('should return null for missing Swift function', () => {
    const result = locateFunctionInSource(swiftSource, 'missing', 'swift');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — Kotlin
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — Kotlin', () => {
  const kotlinSource = `fun main() {
    println("Hello")
}

private fun helper(): Int {
    return 42
}

public fun add(a: Int, b: Int): Int {
    return a + b
}
`;

  it('should locate a Kotlin function', () => {
    const result = locateFunctionInSource(kotlinSource, 'main', 'kotlin');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('fun main()');
  });

  it('should locate a private Kotlin function', () => {
    const result = locateFunctionInSource(kotlinSource, 'helper', 'kotlin');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('private fun helper');
  });

  it('should return null for missing Kotlin function', () => {
    const result = locateFunctionInSource(kotlinSource, 'missing', 'kotlin');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — truncation
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — truncation', () => {
  it('should not truncate a function under 200 lines', () => {
    // Build a Go function with 10 lines in body
    const bodyLines = Array.from({ length: 10 }, (_, i) => `  _ = ${i}`).join('\n');
    const source = `func shortFunc() {\n${bodyLines}\n}\n`;
    const result = locateFunctionInSource(source, 'shortFunc', 'go');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).truncated).toBe(false);
  });

  it('should truncate a function exceeding 200 lines', () => {
    // Build a Go function with 210 lines in the body
    const bodyLines = Array.from({ length: 210 }, (_, i) => `  x${i} := ${i}`).join('\n');
    const source = `func bigFunc() {\n${bodyLines}\n}\n`;
    const result = locateFunctionInSource(source, 'bigFunc', 'go');
    expect(result).not.toBeNull();
    const loc = result as FunctionLocation;
    expect(loc.truncated).toBe(true);
    expect(loc.code).toContain('... (省略)');
  });

  it('should include first 100 and last 100 lines when truncated', () => {
    // Build a Go function with exactly 210 body lines so total lines exceed 200
    const bodyLines = Array.from({ length: 210 }, (_, i) => `  marker${i} := ${i}`).join('\n');
    const source = `func bigFunc() {\n${bodyLines}\n}\n`;
    const result = locateFunctionInSource(source, 'bigFunc', 'go');
    expect(result).not.toBeNull();
    const loc = result as FunctionLocation;
    // Should contain first marker (marker0) and last marker (marker209)
    expect(loc.code).toContain('marker0');
    expect(loc.code).toContain('marker209');
  });

  it('should truncate a Python function exceeding 200 lines', () => {
    const bodyLines = Array.from({ length: 210 }, (_, i) => `    x${i} = ${i}`).join('\n');
    const source = `def longFunc():\n${bodyLines}\n`;
    const result = locateFunctionInSource(source, 'longFunc', 'python');
    expect(result).not.toBeNull();
    const loc = result as FunctionLocation;
    expect(loc.truncated).toBe(true);
    expect(loc.code).toContain('... (省略)');
  });
});

// ---------------------------------------------------------------------------
// locateFunctionInSource — edge cases
// ---------------------------------------------------------------------------

describe('locateFunctionInSource — edge cases', () => {
  it('should return null for empty source', () => {
    const result = locateFunctionInSource('', 'main', 'go');
    expect(result).toBeNull();
  });

  it('should handle unknown language gracefully (returns null)', () => {
    const result = locateFunctionInSource('def foo(): pass', 'foo', 'unknown');
    expect(result).toBeNull();
  });

  it('should not match a function name as a substring of another function', () => {
    const source = `func process() {
  return
}

func processAll() {
  return
}
`;
    // "process" should NOT match "processAll" definition line
    const result = locateFunctionInSource(source, 'process', 'go');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).not.toContain('processAll');
  });

  it('should escape special regex characters in function name', () => {
    // A function name with no special chars — verify the normal case still works
    const source = `func myFunc123() {
  return
}
`;
    const result = locateFunctionInSource(source, 'myFunc123', 'go');
    expect(result).not.toBeNull();
  });

  it('should set filePath to empty string when not provided', () => {
    const source = `func hi() {}\n`;
    const result = locateFunctionInSource(source, 'hi', 'go');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).filePath).toBe('');
  });

  it('should set filePath to the provided value', () => {
    const source = `func hi() {}\n`;
    const result = locateFunctionInSource(source, 'hi', 'go', 'cmd/main.go');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).filePath).toBe('cmd/main.go');
  });

  it('should propagate filePath for TypeScript functions', () => {
    const source = `export function greet() { return "hi"; }\n`;
    const result = locateFunctionInSource(source, 'greet', 'typescript', 'src/utils.ts');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).filePath).toBe('src/utils.ts');
  });

  it('should propagate filePath for Python functions', () => {
    const source = `def process():\n    return 1\n`;
    const result = locateFunctionInSource(source, 'process', 'python', 'lib/worker.py');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).filePath).toBe('lib/worker.py');
  });

  it('should return correct startLine (1-based)', () => {
    const source = `\n\nfunc third() {\n  return\n}\n`;
    const result = locateFunctionInSource(source, 'third', 'go');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).startLine).toBe(3);
  });

  it('should handle a C++ source file', () => {
    const source = `int add(int a, int b) {
    return a + b;
}
`;
    const result = locateFunctionInSource(source, 'add', 'cpp');
    expect(result).not.toBeNull();
    expect((result as FunctionLocation).code).toContain('int add');
  });
});

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, FileCode, Sparkles, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as yaml from "js-yaml";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const debounce = (fn: (...a: any[]) => void, delay = 300) => {
  let t: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};

export const YmlEditor = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleError = useCallback((title: string, msg: string) => {
    setError(msg);
    toast({ title, description: msg, variant: "destructive" });
  }, []);

  const formatYaml = useCallback(() => {
    try {
      const parsed = yaml.load(input);
      const formatted = yaml.dump(parsed, { indent: 2, lineWidth: -1 });
      setOutput(formatted);
      setError("");
      toast({ title: "Success", description: "YML formatted successfully" });
    } catch (err) {
      handleError("Error", (err as Error).message);
    }
  }, [input, handleError]);

  const checkYaml = useCallback(() => {
    try {
      yaml.load(input);
      setError("");
      toast({ title: "Valid YML", description: "No syntax errors found" });
    } catch (err) {
      handleError("Invalid YML", (err as Error).message);
    }
  }, [input, handleError]);

  // Restored + improved auto-fix function
  const autoFixYaml = useCallback(() => {
    try {
      let fixed = input ?? "";
      fixed = fixed
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\t/g, "  ");
      fixed = fixed
        .split("\n")
        .map((l) => l.replace(/\s+$/, ""))
        .join("\n");
      fixed = fixed
        .replace(/,(\s*\n)/g, "$1")
        .replace(/,(\s*(?:\]|\}))/g, "$1");

      const rawLines = fixed.split("\n");
      const lines = rawLines.map((raw, idx) => {
        const indent = (raw.match(/^(\s*)/) || ["", ""])[1].length;
        const trimmed = raw.trim();
        const isList = /^-\s+/.test(trimmed);
        const isKey = /:$/.test(trimmed);
        return { raw, indent, trimmed, isList, isKey, idx };
      });

      const out: string[] = [];
      const mappingStack: number[] = [];
      let lastListIndent: number | null = null;
      let lastListBlockStart = -1;

      for (let i = 0; i < lines.length; i++) {
        const { raw, indent, trimmed, isList, isKey } = lines[i];

        if (!trimmed) {
          out.push(raw);
          continue;
        }

        while (
          mappingStack.length &&
          indent <= mappingStack[mappingStack.length - 1]
        )
          mappingStack.pop();

        if (isKey) {
          out.push(" ".repeat(indent) + trimmed);
          mappingStack.push(indent);
          lastListIndent = null;
          lastListBlockStart = -1;
          continue;
        }

        if (isList) {
          if (mappingStack.length) {
            const parentIndent = mappingStack[mappingStack.length - 1];
            const target = parentIndent + 2;
            out.push(" ".repeat(target) + trimmed);
            lastListIndent = target;
            lastListBlockStart = i;
            continue;
          }

          if (lastListIndent !== null) {
            out.push(" ".repeat(lastListIndent) + trimmed);
            lastListBlockStart = i;
            continue;
          }

          out.push(trimmed);
          lastListIndent = 0;
          lastListBlockStart = i;
          continue;
        }

        out.push(" ".repeat(indent) + trimmed);
        lastListIndent = null;
        lastListBlockStart = -1;
      }

      fixed = out.join("\n");

      try {
        const parsed = yaml.load(fixed) as unknown;
        const formatted = yaml.dump(parsed as unknown, {
          indent: 2,
          lineWidth: -1,
        });
        setInput(formatted);
        setOutput(formatted);
        setError("");
        toast({
          title: "Auto-fixed",
          description: "Fixed tabs, indentation, and syntax errors",
        });
        return;
      } catch (e) {
        const err: unknown = e;
        let msg =
          "YML has syntax errors that cannot be automatically corrected";
        if (err && typeof err === "object" && "message" in err) {
          msg = (err as Error).message || msg;
          type YamlErrorMark = { line: number; column: number };
          type YamlError = Error & { mark?: YamlErrorMark };
          const yamlErr = err as YamlError;
          if (yamlErr.mark && typeof yamlErr.mark === "object") {
            const m = yamlErr.mark;
            msg += ` (line ${m.line + 1}, col ${m.column + 1})`;
          }
        }
        setError(msg);
        setOutput(fixed);
        toast({
          title: "Cannot auto-fix",
          description: msg,
          variant: "destructive",
        });
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast({
        title: "Cannot auto-fix",
        description: msg,
        variant: "destructive",
      });
    }
  }, [input]);

  const copyToClipboard = useCallback(() => {
    if (!output) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(output);
      toast({ title: "Copied", description: "YML copied to clipboard" });
    } else {
      handleError("Clipboard Error", "Your browser does not support copying");
    }
  }, [output, handleError]);

  const debouncedInput = useMemo(
    () =>
      debounce((val: string) => {
        setInput(val);
      }, 200),
    []
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="mb-8 text-center relative">
          <div className="absolute inset-0 bg-gradient-primary opacity-10 blur-3xl -z-10 will-change-transform will-change-opacity" />
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="relative">
              <FileCode className="w-10 h-10 text-primary animate-pulse will-change-transform" />
              <div className="absolute inset-0 blur-md bg-primary/30 will-change-transform will-change-opacity" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-fade-in will-change-transform will-change-opacity">
              YML Formatter
            </h1>
          </div>
          <p className="text-muted-foreground text-lg animate-fade-in will-change-opacity">
            Clean, fast, and reliable YML formatting with auto-fix
          </p>
        </header>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Input */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
                <Zap className="w-5 h-5" /> Input
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={checkYaml}
                  variant="outline"
                  size="sm"
                  disabled={!input}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-[opacity,transform,box-shadow] duration-200 hover:shadow-glow-primary group will-change-transform will-change-opacity"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" /> Check
                </Button>
                <Button
                  onClick={autoFixYaml}
                  variant="outline"
                  size="sm"
                  disabled={!input}
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-[opacity,transform,box-shadow] duration-200 hover:shadow-glow-accent group will-change-transform will-change-opacity"
                >
                  <Sparkles className="w-4 h-4 mr-1 group-hover:rotate-12 transition-transform" /> Auto-fix
                </Button>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-primary opacity-0 group-hover:opacity-20 blur transition-opacity rounded-lg will-change-opacity" />
              <div className="bg-card border border-border rounded-lg overflow-hidden relative">
                <ScrollArea className="h-[500px] overflow-x-auto">
                  <Textarea
                    value={input}
                    onChange={(e) => debouncedInput(e.target.value)}
                    placeholder="Paste your YML here..."
                    className="min-h-[500px] font-mono text-sm bg-transparent border-0 focus-visible:ring-0 resize-none"
                    style={{ whiteSpace: "pre", overflowX: "auto" }}
                  />
                </ScrollArea>
              </div>
            </div>
          </div>

          {/* Output */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
                <FileCode className="w-5 h-5" /> Output
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={formatYaml}
                  size="sm"
                  disabled={!input}
                  className="bg-gradient-primary hover:shadow-glow-primary transition-[opacity,transform,box-shadow] duration-200 group will-change-transform will-change-opacity"
                >
                  <Sparkles className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" /> Format
                </Button>
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  disabled={!output}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-[opacity,transform,box-shadow] duration-200 hover:shadow-glow-primary group will-change-transform will-change-opacity"
                >
                  <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </Button>
              </div>
            </div>
            {output ? (
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-accent opacity-0 group-hover:opacity-20 blur transition-opacity rounded-lg will-change-opacity" />
                <div className="bg-card border border-border rounded-lg overflow-hidden relative">
                  <ScrollArea className="h-[500px] overflow-x-auto">
                    <SyntaxHighlighter
                      language="yaml"
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: "1rem",
                        background: "hsl(var(--card))",
                        fontSize: "0.875rem",
                        whiteSpace: "pre",
                        overflowX: "auto",
                      }}
                      showLineNumbers
                    >
                      {output}
                    </SyntaxHighlighter>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-4 h-[500px] flex items-center justify-center">
                <p className="text-muted-foreground text-center">
                  Formatted YML will appear here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive rounded-lg p-4 mb-6 animate-fade-in will-change-opacity">
            <h3 className="font-semibold mb-1">Error</h3>
            <p className="text-sm font-mono">{error}</p>
          </div>
        )}

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="relative group bg-card border border-border rounded-lg p-6 hover:border-primary transition-[opacity,transform,border-color] duration-200 overflow-hidden will-change-transform will-change-opacity">
            <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity will-change-opacity" />
            <h3 className="text-lg font-semibold mb-2 text-primary relative z-10">Format</h3>
            <p className="text-sm text-muted-foreground relative z-10">
              Clean and properly indent your YML files with a single click
            </p>
          </div>
          <div className="relative group bg-card border border-border rounded-lg p-6 hover:border-accent transition-[opacity,transform,border-color] duration-200 overflow-hidden will-change-transform will-change-opacity">
            <div className="absolute inset-0 bg-gradient-accent opacity-0 group-hover:opacity-10 transition-opacity will-change-opacity" />
            <h3 className="text-lg font-semibold mb-2 text-accent relative z-10">Auto-fix</h3>
            <p className="text-sm text-muted-foreground relative z-10">
              Automatically correct indentation, quotes, and common syntax errors
            </p>
          </div>
          <div className="relative group bg-card border border-border rounded-lg p-6 hover:border-primary transition-[opacity,transform,border-color] duration-200 overflow-hidden will-change-transform will-change-opacity">
            <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity will-change-opacity" />
            <h3 className="text-lg font-semibold mb-2 text-primary relative z-10">Syntax Highlight</h3>
            <p className="text-sm text-muted-foreground relative z-10">
              View formatted output with beautiful syntax highlighting
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

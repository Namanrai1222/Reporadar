import { test, expect } from "@playwright/test";
import { buildStructure, roleOf } from "../../src/lib/structure";

test.describe("buildStructure — architecture map data", () => {
  // Shape of a typical Python ML repo: no web routes, so the old map was empty.
  const paths = [
    "README.md", "requirements.txt", "app.py", "Dockerfile",
    "src/model.py", "src/preprocess.py", "src/utils/text.py", "src/utils/io.py",
    "notebooks/eda.ipynb", "notebooks/train.ipynb",
    "data/raw/train.csv", "data/raw/test.csv", "data/processed/clean.csv",
    "tests/test_model.py",
    ".github/workflows/ci.yml",
  ];
  const structure = buildStructure(paths);

  test("counts every file and the ones at the root", () => {
    expect(structure.totalFiles).toBe(15);
    expect(structure.rootFiles).toBe(4);
  });

  test("orders top-level folders by size and nests second-level ones", () => {
    const top = structure.dirs.filter((d) => d.depth === 1).map((d) => [d.path, d.files]);
    expect(top[0]).toEqual(["src", 4]);
    expect(top).toContainEqual(["data", 3]);
    const raw = structure.dirs.find((d) => d.path === "data/raw");
    expect(raw).toMatchObject({ depth: 2, files: 2, role: "data" });
  });

  test("gives conventional folders a role, and generic subfolders their parent's", () => {
    const role = (path: string) => structure.dirs.find((d) => d.path === path)?.role;
    expect(role("notebooks")).toBe("notebooks");
    expect(role("tests")).toBe("tests");
    expect(role(".github")).toBe("ci");
    expect(role("src/utils")).toBe("lib");
    expect(roleOf("whatever")).toBe("other");
  });

  test("finds the files that explain the setup", () => {
    const kinds = Object.fromEntries(structure.keyFiles.map((f) => [f.path, f.kind]));
    expect(kinds).toMatchObject({
      "requirements.txt": "manifest",
      "app.py": "entry",
      Dockerfile: "container",
      "README.md": "docs",
      ".github/workflows/ci.yml": "ci",
    });
  });

  test("ranks languages by file count", () => {
    expect(structure.languages[0]).toEqual({ name: "Python", files: 6 });
  });

  test("leaves out generated folders like __pycache__", () => {
    const noisy = buildStructure(["src/a.py", "src/__pycache__/a.cpython-311.pyc", "__pycache__/x.pyc", ".DS_Store"]);
    expect(noisy.totalFiles).toBe(1);
    expect(noisy.dirs.map((d) => d.path)).toEqual(["src"]);
  });

  test("ignores duplicate and empty paths", () => {
    expect(buildStructure(["a.ts", "a.ts", ""]).totalFiles).toBe(1);
    expect(buildStructure([]).dirs).toEqual([]);
  });
});

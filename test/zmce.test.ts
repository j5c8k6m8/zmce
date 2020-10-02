import fs from "fs-extra";
import { join, relative } from "path";
import colors from "colors/safe";

const zmce = require("../src/zmce.ts");

const articlesDirectoryName = "articles";
const modulesDirectoryName = "submodules";

const spyInfo = jest.spyOn(console, "info").mockImplementation((x) => x);
const spyWarn = jest.spyOn(console, "warn").mockImplementation((x) => x);
const spyError = jest.spyOn(console, "error").mockImplementation((x) => x);

const spyWriteFileSync = jest
  .spyOn(fs, "writeFileSync")
  .mockImplementation((x) => x);

const expectWriteFileSync = (basePath: string, expectedPath: string) => {
  spyWriteFileSync.mock.calls.forEach((c) => {
    let expectedContent;
    try {
      expectedContent = fs.readFileSync(
        join(expectedPath, relative(basePath, String(c[0]))),
        "utf8"
      );
    } catch {
      expectedContent = "";
    }
    expect(c[1]).toEqual(expectedContent);
    expect(c[2]).toBe("utf8");
  });
};

const cwd = process.cwd();

describe("zmce error case", () => {
  afterEach(() => {
    expect(spyInfo.mock.calls).toEqual([
      [colors.cyan("[START] zmce")],
      [colors.cyan("[ END ] zmce")],
    ]);
    expect(spyWarn.mock.calls).toEqual([]);
    expect(spyWriteFileSync.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it("not exists directories", () => {
    const spyCwd = jest
      .spyOn(process, "cwd")
      .mockImplementation(() =>
        join(cwd, "test/error_case/not_exists_directories")
      );
    zmce.main();
    expect(spyError.mock.calls).toEqual([
      [
        colors.red(
          `プロジェクトルートに${articlesDirectoryName}ディレクトリを作成してください`
        ),
      ],
      [
        colors.red(
          `プロジェクトルートに${modulesDirectoryName}ディレクトリを作成してください`
        ),
      ],
    ]);
    spyCwd.mockRestore();
  });

  it("not exists articeles directories", () => {
    const spyCwd = jest
      .spyOn(process, "cwd")
      .mockImplementation(() =>
        join(cwd, "test/error_case/not_exists_articeles_directories")
      );
    zmce.main();
    expect(spyError.mock.calls).toEqual([
      [
        colors.red(
          `プロジェクトルートに${articlesDirectoryName}ディレクトリを作成してください`
        ),
      ],
    ]);
    spyCwd.mockRestore();
  });

  it("not exists submodules directories", () => {
    const spyCwd = jest
      .spyOn(process, "cwd")
      .mockImplementation(() =>
        join(cwd, "test/error_case/not_exists_submodules_directories")
      );
    zmce.main();
    expect(spyError.mock.calls).toEqual([
      [
        colors.red(
          `プロジェクトルートに${modulesDirectoryName}ディレクトリを作成してください`
        ),
      ],
    ]);
    spyCwd.mockRestore();
  });
});

describe("zmce warn case", () => {
  afterEach(() => {
    expect(spyInfo.mock.calls).toEqual([
      [colors.cyan("[START] zmce")],
      [colors.cyan("[ END ] zmce")],
    ]);
    expect(spyError.mock.calls).toEqual([]);
    expect(spyWriteFileSync.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(0);
    process.exitCode = 0;
  });

  it("not exists code file", () => {
    const spyCwd = jest
      .spyOn(process, "cwd")
      .mockImplementation(() =>
        join(cwd, "test/warn_case/not_exists_code_file")
      );
    zmce.main();
    expect(spyWarn.mock.calls).toEqual([
      [
        colors.yellow(
          "[articles/test01.md] モジュールディレクトリに「test_repository/test01.md」ファイルがありません"
        ),
      ],
    ]);
    spyCwd.mockRestore();
  });
});

describe("zmce skip case", () => {
  afterEach(() => {
    expect(spyInfo.mock.calls).toEqual([
      [colors.cyan("[START] zmce")],
      [colors.cyan("[ END ] zmce")],
    ]);
    expect(spyWarn.mock.calls).toEqual([]);
    expect(spyError.mock.calls).toEqual([]);
    expect(spyWriteFileSync.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(0);
    process.exitCode = 0;
  });

  it("not exists md file", () => {
    const spyCwd = jest
      .spyOn(process, "cwd")
      .mockImplementation(() => join(cwd, "test/skip_case/not_exists_md_file"));
    zmce.main();
    spyCwd.mockRestore();
  });

  it("not exists replace code", () => {
    const spyCwd = jest
      .spyOn(process, "cwd")
      .mockImplementation(() =>
        join(cwd, "test/skip_case/not_exists_replace_code")
      );
    zmce.main();
    spyCwd.mockRestore();
  });

  it("not change md file", () => {
    const spyCwd = jest
      .spyOn(process, "cwd")
      .mockImplementation(() => join(cwd, "test/skip_case/not_change_md_file"));
    zmce.main();
    spyCwd.mockRestore();
  });

  it("not change md file with codeblock", () => {
    const spyCwd = jest
      .spyOn(process, "cwd")
      .mockImplementation(() =>
        join(cwd, "test/skip_case/not_change_md_file_with_codeblock")
      );
    zmce.main();
    spyCwd.mockRestore();
  });

  it("not exists end phrase", () => {
    const spyCwd = jest
      .spyOn(process, "cwd")
      .mockImplementation(() =>
        join(cwd, "test/skip_case/not_exists_end_phrase")
      );
    zmce.main();
    spyCwd.mockRestore();
  });
});

const normal_case_test = (testDirectory: string, changeMdFiles: [string]) => {
  const spyCwd = jest
    .spyOn(process, "cwd")
    .mockImplementation(() => join(cwd, testDirectory + "/received"));
  zmce.main();
  expectWriteFileSync(
    join(cwd, testDirectory + "/received"),
    join(cwd, testDirectory + "/expected")
  );
  expect(spyInfo.mock.calls).toEqual([
    [colors.cyan("[START] zmce")],
    ...changeMdFiles.map((f) => [`${f}のコードブロックを修正しました。`]),
    [colors.cyan("[ END ] zmce")],
  ]);
  spyCwd.mockRestore();
};

describe("zmce normal case", () => {
  afterEach(() => {
    expect(spyWarn.mock.calls).toEqual([]);
    expect(spyError.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(0);
    process.exitCode = 0;
  });

  it("simple init", () => {
    normal_case_test("test/normal_case/simple_init", ["test01.md"]);
  });

  it("simple change", () => {
    normal_case_test("test/normal_case/simple_change", ["test01.md"]);
  });

  it("simple more info", () => {
    normal_case_test("test/normal_case/simple_more_info", ["test01.md"]);
  });

  it("replace_md_with_codeblock", () => {
    normal_case_test("test/normal_case/replace_md_with_codeblock", [
      "test01.md",
    ]);
  });
});

// TODO total_caseだけかく
describe("zmce total case", () => {
  it("total case", () => {
    const spyCwd = jest
      .spyOn(process, "cwd")
      .mockImplementation(() => join(cwd, "test/total_case/received"));
    zmce.main();
    expectWriteFileSync(
      join(cwd, "test/total_case/received"),
      join(cwd, "test/total_case/expected")
    );
    expect(spyInfo.mock.calls).toEqual([
      [colors.cyan("[START] zmce")],
      [`03_normal01.mdのコードブロックを修正しました。`],
      [`04_total01.mdのコードブロックを修正しました。`],
      [`05_normal02.mdのコードブロックを修正しました。`],
      [`07_total02.mdのコードブロックを修正しました。`],
      [colors.cyan("[ END ] zmce")],
    ]);
    expect(spyWarn.mock.calls).toEqual([
      [ colors.yellow(
        "[articles/01_warn01.md] モジュールディレクトリに「not_exists/test.js」ファイルがありません"
      ) ],
      [ colors.yellow(
        "[articles/04_total01.md] モジュールディレクトリに「not_exists/test.js」ファイルがありません"
      ) ],
      [ colors.yellow(
        "[articles/08_warn02.md] モジュールディレクトリに「test/not_exists.js」ファイルがありません"
      ) ],
      [ colors.yellow(
        "[articles/08_warn02.md] モジュールディレクトリに「test/not_exists2.js」ファイルがありません"
      ) ],
    ]);
    expect(spyError.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(0);
    process.exitCode = 0;
    spyCwd.mockRestore();
  });
});

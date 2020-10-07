import fs from "fs-extra";
import { join, relative } from "path";
import colors from "colors/safe";

const zmce = require("../src/zmce.ts");

const articlesDirectoryName = "articles";
const booksDirectoryName = "books";
const modulesDirectoryName = "submodules";

const spyInfo = jest.spyOn(console, "info").mockImplementation((x) => x);
const spyWarn = jest.spyOn(console, "warn").mockImplementation((x) => x);
const spyError = jest.spyOn(console, "error").mockImplementation((x) => x);

const spyWriteFileSync = jest
  .spyOn(fs, "writeFileSync")
  .mockImplementation((x) => x);

const cwd = process.cwd();

const inSpyCwd = (relativePath: string, callback: () => void) => {
  const spyCwd = jest
    .spyOn(process, "cwd")
    .mockImplementation(() => join(cwd, relativePath));
  callback();
  spyCwd.mockRestore();
};

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
    inSpyCwd("test/error_case/not_exists_directories", () => {
      zmce.main();
      expect(spyError.mock.calls).toEqual([
        [
          colors.red(
            `プロジェクトルートに${modulesDirectoryName}ディレクトリを作成してください`
          ),
        ],
        [
          colors.red(
            `プロジェクトルートに${articlesDirectoryName}ディレクトリを作成してください`
          ),
        ],
        [
          colors.red(
            `プロジェクトルートに${booksDirectoryName}ディレクトリを作成してください`
          ),
        ],
      ]);
    });
  });

  it("not exists submodules directories", () => {
    inSpyCwd("test/error_case/not_exists_submodules_directories", () => {
      zmce.main();
      expect(spyError.mock.calls).toEqual([
        [
          colors.red(
            `プロジェクトルートに${modulesDirectoryName}ディレクトリを作成してください`
          ),
        ],
      ]);
    });
  });

  it("not exists articeles directories", () => {
    inSpyCwd("test/error_case/not_exists_articeles_directories", () => {
      zmce.main();
      expect(spyError.mock.calls).toEqual([
        [
          colors.red(
            `プロジェクトルートに${articlesDirectoryName}ディレクトリを作成してください`
          ),
        ],
      ]);
    });
  });

  it("not exists books directories", () => {
    inSpyCwd("test/error_case/not_exists_books_directories", () => {
      zmce.main();
      expect(spyError.mock.calls).toEqual([
        [
          colors.red(
            `プロジェクトルートに${booksDirectoryName}ディレクトリを作成してください`
          ),
        ],
      ]);
    });
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
    inSpyCwd("test/warn_case/not_exists_code_file", () => {
      zmce.main();
      expect(spyWarn.mock.calls).toEqual([
        [
          colors.yellow(
            "[articles/test01.md] モジュールディレクトリに「test_repository/test01.md」ファイルがありません"
          ),
        ],
      ]);
    });
  });

  it("exists codeblock", () => {
    inSpyCwd("test/warn_case/exists_codeblock", () => {
      zmce.main();
      expect(spyWarn.mock.calls).toEqual([
        [
          colors.yellow(
            "[articles/test01.md] 「test/test.md」ファイル内に使用できないパターン(^```)が含まれています。"
          ),
        ],
      ]);
    });
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

  it("root md file", () => {
    inSpyCwd("test/skip_case/root_md_file", () => {
      zmce.main();
    });
  });

  it("not exists article md file", () => {
    inSpyCwd("test/skip_case/not_exists_article_md_file", () => {
      zmce.main();
    });
  });

  it("not exists book md file", () => {
    inSpyCwd("test/skip_case/not_exists_book_md_file", () => {
      zmce.main();
    });
  });

  it("books direct children md file", () => {
    inSpyCwd("test/skip_case/books_direct_children_md_file", () => {
      zmce.main();
    });
  });

  it("not exists replace code", () => {
    inSpyCwd("test/skip_case/not_exists_replace_code", () => {
      zmce.main();
    });
  });

  it("not change md file", () => {
    inSpyCwd("test/skip_case/not_change_md_file", () => {
      zmce.main();
    });
  });

  it("not exists end phrase", () => {
    inSpyCwd("test/skip_case/not_exists_end_phrase", () => {
      zmce.main();
    });
  });
});

const normal_case_test = (testDirectory: string, changeMdFiles: [string]) => {
  inSpyCwd(join(testDirectory, "received"), () => {
    zmce.main();
    expect(spyInfo.mock.calls).toEqual([
      [colors.cyan("[START] zmce")],
      ...changeMdFiles.map((f) => [`[${f}] コードブロックを修正しました。`]),
      [colors.cyan("[ END ] zmce")],
    ]);
    expectWriteFileSync(
      join(cwd, join(testDirectory, "received")),
      join(cwd, join(testDirectory, "expected"))
    );
  });
};

describe("zmce normal case", () => {
  afterEach(() => {
    expect(spyWarn.mock.calls).toEqual([]);
    expect(spyError.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(0);
    process.exitCode = 0;
  });

  it("simple article init", () => {
    normal_case_test("test/normal_case/simple_article_init", ["articles/test01.md"]);
  });

  it("simple book init", () => {
    normal_case_test("test/normal_case/simple_book_init", ["books/book_test/test01.md"]);
  });

  it("simple change", () => {
    normal_case_test("test/normal_case/simple_change", ["articles/test01.md"]);
  });

  it("simple more info", () => {
    normal_case_test("test/normal_case/simple_more_info", [
      "articles/test01.md",
    ]);
  });
});

describe("zmce total case", () => {
  it("total case", () => {
    inSpyCwd("test/total_case/received", () => {
      zmce.main();
      expect(spyInfo.mock.calls).toEqual([
        [colors.cyan("[START] zmce")],
        [`[articles/03_normal01.md] コードブロックを修正しました。`],
        [`[articles/04_total01.md] コードブロックを修正しました。`],
        [`[articles/05_normal02.md] コードブロックを修正しました。`],
        [`[articles/07_total02.md] コードブロックを修正しました。`],
        [`[books/book_test1/03_normal01.md] コードブロックを修正しました。`],
        [`[books/book_test1/04_total01.md] コードブロックを修正しました。`],
        [`[books/book_test1/05_normal02.md] コードブロックを修正しました。`],
        [`[books/book_test1/07_total02.md] コードブロックを修正しました。`],
        [`[books/book_test2/03_normal01.md] コードブロックを修正しました。`],
        [`[books/book_test2/04_total01.md] コードブロックを修正しました。`],
        [`[books/book_test2/05_normal02.md] コードブロックを修正しました。`],
        [`[books/book_test2/07_total02.md] コードブロックを修正しました。`],
        [colors.cyan("[ END ] zmce")],
      ]);
      expect(spyWarn.mock.calls).toEqual([
        [
          colors.yellow(
            "[articles/01_warn01.md] モジュールディレクトリに「not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[articles/04_total01.md] モジュールディレクトリに「not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[articles/08_warn02.md] モジュールディレクトリに「test/not_exists.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[articles/08_warn02.md] モジュールディレクトリに「test/not_exists2.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test1/01_warn01.md] モジュールディレクトリに「not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test1/04_total01.md] モジュールディレクトリに「not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test1/08_warn02.md] モジュールディレクトリに「test/not_exists.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test1/08_warn02.md] モジュールディレクトリに「test/not_exists2.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test2/01_warn01.md] モジュールディレクトリに「not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test2/04_total01.md] モジュールディレクトリに「not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test2/08_warn02.md] モジュールディレクトリに「test/not_exists.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test2/08_warn02.md] モジュールディレクトリに「test/not_exists2.js」ファイルがありません"
          ),
        ],
      ]);
      expect(spyError.mock.calls).toEqual([]);
      expectWriteFileSync(
        join(cwd, "test/total_case/received"),
        join(cwd, "test/total_case/expected")
      );
      expect(process.exitCode).toBe(0);
      process.exitCode = 0;
    });
  });
});

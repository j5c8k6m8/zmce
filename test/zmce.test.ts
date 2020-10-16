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

const error_case_test = (testDirectory: string, errMsgs: string[]) => {
  inSpyCwd(testDirectory, () => {
    zmce.main();
    expect(spyError.mock.calls).toEqual([
      ...errMsgs.map((msg) => [colors.red(msg)]),
    ]);
  });
};

describe("zmce error case", () => {
  beforeEach(() => (process.exitCode = 0));
  afterEach(() => {
    expect(spyInfo.mock.calls).toEqual([
      ["[zmce] 処理を開始します。"],
      ["[zmce] エラーが発生したため、置換処理を行わずに終了します。"],
    ]);
    expect(spyWarn.mock.calls).toEqual([]);
    expect(spyWriteFileSync.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(1);
  });

  it("not exists directories", () => {
    error_case_test("test/error_case/not_exists_directories", [
      `プロジェクトルートに${articlesDirectoryName}ディレクトリがありません。`,
      `プロジェクトルートに${booksDirectoryName}ディレクトリがありません。`,
    ]);
  });

  it("not exists articeles directories", () => {
    error_case_test("test/error_case/not_exists_articeles_directories", [
      `プロジェクトルートに${articlesDirectoryName}ディレクトリがありません。`,
    ]);
  });

  it("not exists books directories", () => {
    error_case_test("test/error_case/not_exists_books_directories", [
      `プロジェクトルートに${booksDirectoryName}ディレクトリがありません。`,
    ]);
  });

  it("config not yaml format", () => {
    error_case_test("test/error_case/config_not_yaml_format", [
      `[zmce.config.yaml] 設定ファイルのフォーマットがyamlファイルとして不正です。`,
    ]);
  });

  it("config not hash", () => {
    error_case_test("test/error_case/config_not_hash", [
      `[zmce.config.yaml] 連想配列(ハッシュ)で記載してください。`,
    ]);
  });

  it("config relativeRoot not string", () => {
    error_case_test("test/error_case/config_relative_root_not_string", [
      `[zmce.config.yaml] 設定ファイルのrelativeRootプロパティには文字列を指定してください。`,
    ]);
  });

  it("config fenceStr invalid", () => {
    error_case_test("test/error_case/config_fence_str_invalid", [
      `[zmce.config.yaml] 設定ファイルのfenceStrプロパティには「*」もしくは「~」の連続した3文字以上の文字列を指定してください。`,
    ]);
  });

  it("config articles not hash", () => {
    error_case_test("test/error_case/config_articles_not_hash", [
      `[zmce.config.yaml] 設定ファイルのarticlesプロパティは連想配列(ハッシュ)で記載してください。`,
    ]);
  });

  it("config books not hash", () => {
    error_case_test("test/error_case/config_books_not_hash", [
      `[zmce.config.yaml] 設定ファイルのbooksプロパティは連想配列(ハッシュ)で記載してください。`,
    ]);
  });

  it("config each file not hash", () => {
    error_case_test("test/error_case/config_each_file_not_hash", [
      `[zmce.config.yaml] 設定ファイルのarticles.file1プロパティは連想配列(ハッシュ)で記載してください。`,
    ]);
  });

  it("config each file relativeRoot not string", () => {
    error_case_test(
      "test/error_case/config_each_file_relative_root_not_string",
      [
        `[zmce.config.yaml] 設定ファイルのarticles.file1.relativeRootプロパティには文字列を指定してください。`,
      ]
    );
  });

  it("config each file fenceStr invalid", () => {
    error_case_test("test/error_case/config_each_file_fence_str_invalid", [
      `[zmce.config.yaml] 設定ファイルのarticles.file1.fenceStrプロパティには「*」もしくは「~」の連続した3文字以上の文字列を指定してください。`,
    ]);
  });
});

describe("zmce warn case", () => {
  beforeEach(() => (process.exitCode = 0));
  afterEach(() => {
    expect(spyInfo.mock.calls).toEqual([
      ["[zmce] 処理を開始します。"],
      ["[zmce] 処理を終了します。"],
    ]);
    expect(spyError.mock.calls).toEqual([]);
    expect(spyWriteFileSync.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(0);
  });

  it("not exists code file", () => {
    inSpyCwd("test/warn_case/not_exists_code_file", () => {
      zmce.main();
      expect(spyWarn.mock.calls).toEqual([
        [
          colors.yellow(
            "[articles/test01.md] 「submodules/test_repository/test01.md」ファイルがありません"
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
            "[articles/test01.md] 「submodules/test/test.md」ファイル内に使用できないパターン(^```)が含まれています。"
          ),
        ],
      ]);
    });
  });
});

describe("zmce skip case", () => {
  beforeEach(() => (process.exitCode = 0));
  afterEach(() => {
    expect(spyInfo.mock.calls).toEqual([
      ["[zmce] 処理を開始します。"],
      ["[zmce] 処理を終了します。"],
    ]);
    expect(spyWarn.mock.calls).toEqual([]);
    expect(spyError.mock.calls).toEqual([]);
    expect(spyWriteFileSync.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(0);
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

const normal_case_test = (testDirectory: string, changeMdFiles: string[]) => {
  inSpyCwd(join(testDirectory, "received"), () => {
    zmce.main();
    expect(spyInfo.mock.calls).toEqual([
      ["[zmce] 処理を開始します。"],
      ...changeMdFiles.map((f) => [
        colors.cyan(`[${f}] コードブロックを修正しました。`),
      ]),
      ["[zmce] 処理を終了します。"],
    ]);
    expectWriteFileSync(
      join(cwd, join(testDirectory, "received")),
      join(cwd, join(testDirectory, "expected"))
    );
  });
};

describe("zmce normal case", () => {
  beforeEach(() => (process.exitCode = 0));
  afterEach(() => {
    expect(spyWarn.mock.calls).toEqual([]);
    expect(spyError.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(0);
  });

  it("simple article init", () => {
    normal_case_test("test/normal_case/simple_article_init", [
      "articles/test01.md",
    ]);
  });

  it("simple book init", () => {
    normal_case_test("test/normal_case/simple_book_init", [
      "books/book_test/test01.md",
    ]);
  });

  it("simple change", () => {
    normal_case_test("test/normal_case/simple_change", ["articles/test01.md"]);
  });

  it("simple more info", () => {
    normal_case_test("test/normal_case/simple_more_info", [
      "articles/test01.md",
    ]);
  });

  it("config blank", () => {
    normal_case_test("test/normal_case/config_blank", ["articles/test01.md"]);
  });

  it("config relativeRoot change for article", () => {
    normal_case_test(
      "test/normal_case/config_relative_root_change_for_article",
      ["articles/test01.md"]
    );
  });

  it("config fenceStr change for article", () => {
    normal_case_test("test/normal_case/config_fence_str_change_for_article", [
      "articles/test01.md",
    ]);
  });

  it("config each file relativeRoot change for article", () => {
    normal_case_test(
      "test/normal_case/config_each_file_relative_root_change_for_article",
      ["articles/test01.md"]
    );
  });

  it("config each file fenceStr change for article", () => {
    normal_case_test(
      "test/normal_case/config_each_file_fence_str_change_for_article",
      ["articles/test01.md"]
    );
  });

  it("config relativeRoot change for book", () => {
    normal_case_test("test/normal_case/config_relative_root_change_for_book", [
      "books/book_test/test01.md",
    ]);
  });

  it("config fenceStr change for book", () => {
    normal_case_test("test/normal_case/config_fence_str_change_for_book", [
      "books/book_test/test01.md",
    ]);
  });

  it("config each file relativeRoot change for book", () => {
    normal_case_test(
      "test/normal_case/config_each_file_relative_root_change_for_book",
      ["books/book_test/test01.md"]
    );
  });

  it("config each file fenceStr change for book", () => {
    normal_case_test(
      "test/normal_case/config_each_file_fence_str_change_for_book",
      ["books/book_test/test01.md"]
    );
  });
});

describe("zmce total case", () => {
  beforeEach(() => (process.exitCode = 0));
  it("total case", () => {
    inSpyCwd("test/total_case/received", () => {
      zmce.main();
      expect(spyInfo.mock.calls).toEqual([
        ["[zmce] 処理を開始します。"],
        [
          colors.cyan(
            "[articles/03_normal01.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[articles/04_total01.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[articles/05_normal02.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[articles/07_total02.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/book_test1/03_normal01.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/book_test1/04_total01.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/book_test1/05_normal02.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/book_test1/07_total02.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/book_test2/03_normal01.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/book_test2/04_total01.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/book_test2/05_normal02.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/book_test2/07_total02.md] コードブロックを修正しました。"
          ),
        ],
        ["[zmce] 処理を終了します。"],
      ]);
      expect(spyWarn.mock.calls).toEqual([
        [
          colors.yellow(
            "[articles/01_warn01.md] 「submodules/not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[articles/04_total01.md] 「submodules/not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[articles/08_warn02.md] 「submodules/test/not_exists.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[articles/08_warn02.md] 「submodules/test/not_exists2.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test1/01_warn01.md] 「submodules/not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test1/04_total01.md] 「submodules/not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test1/08_warn02.md] 「submodules/test/not_exists.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test1/08_warn02.md] 「submodules/test/not_exists2.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test2/01_warn01.md] 「submodules/not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test2/04_total01.md] 「submodules/not_exists/test.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test2/08_warn02.md] 「submodules/test/not_exists.js」ファイルがありません"
          ),
        ],
        [
          colors.yellow(
            "[books/book_test2/08_warn02.md] 「submodules/test/not_exists2.js」ファイルがありません"
          ),
        ],
      ]);
      expect(spyError.mock.calls).toEqual([]);
      expectWriteFileSync(
        join(cwd, "test/total_case/received"),
        join(cwd, "test/total_case/expected")
      );
      expect(process.exitCode).toBe(0);
    });
  });
});

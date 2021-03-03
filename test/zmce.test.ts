import fs from "fs-extra";
import { join, relative } from "path";
import colors from "colors/safe";
import child_process from "child_process";

const zmce = require("../src/zmce.ts");

const articlesDirectoryName = "articles";
const booksDirectoryName = "books";
const modulesDirectoryName = "submodules";

const spyInfo = jest.spyOn(console, "info").mockImplementation((x) => x);
const spyWarn = jest.spyOn(console, "warn").mockImplementation((x) => x);
const spyError = jest.spyOn(console, "error").mockImplementation((x) => x);

const orgFsWriteFileSync = fs.writeFileSync;

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

const setSpyChildProcess = () => {
  const spyChildProcess = jest
    .spyOn(child_process, "execSync")
    .mockImplementation((cmd: string) => {
      let errorIgnore = false;
      if (cmd.endsWith(" 2>&1")) {
        cmd = cmd.substring(0, cmd.length - 5); // 5 == " 2>&1".length
        errorIgnore = true;
      }
      if (cmd.startsWith("echo ")) {
        return Buffer.from(cmd.substring(5) + "\n"); // 5 == "echo ".length
      } else if (errorIgnore) {
        throw {
          message: `[mock]Command failed: ${cmd}\n/bin/sh: 1: ${cmd}: command not found`,
          status: 127,
          stdout: `/bin/sh: 1: ${cmd}: command not found\n`,
          stderr: ``,
        };
      } else {
        throw {
          message: `[mock]Command failed: ${cmd}\n/bin/sh: 1: ${cmd}: command not found`,
          status: 127,
          stdout: ``,
          stderr: `/bin/sh: 1: ${cmd}: command not found\n`,
        };
      }
    });
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
      expectedContent = '';
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
      `[zmce.config.yaml] 設定ファイルのfenceStrプロパティには「\`」もしくは「~」の連続した3文字以上の文字列を指定してください。`,
    ]);
  });

  it("config skip not boolean", () => {
    error_case_test("test/error_case/config_skip_not_boolean", [
      `[zmce.config.yaml] 設定ファイルのskipプロパティにはtrue/falseを指定してください。`,
    ]);
  });

  it("config sessionPrompt not string", () => {
    error_case_test("test/error_case/config_session_prompt_not_string", [
      `[zmce.config.yaml] 設定ファイルのsessionPromptプロパティには文字列を指定してください。`,
    ]);
  });

  it("config sessionIgnoreError not boolean", () => {
    error_case_test("test/error_case/config_session_ignore_error_not_boolean", [
      `[zmce.config.yaml] 設定ファイルのsessionIgnoreErrorプロパティにはtrue/falseを指定してください。`,
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
      `[zmce.config.yaml] 設定ファイルのarticles.file1.fenceStrプロパティには「\`」もしくは「~」の連続した3文字以上の文字列を指定してください。`,
    ]);
  });

  it("config each file skip not boolean", () => {
    error_case_test("test/error_case/config_each_file_skip_not_boolean", [
      `[zmce.config.yaml] 設定ファイルのarticles.file1.skipプロパティにはtrue/falseを指定してください。`,
    ]);
  });

  it("config each file sessionPrompt not string", () => {
    error_case_test(
      "test/error_case/config_each_file_session_prompt_not_string",
      [
        `[zmce.config.yaml] 設定ファイルのarticles.file1.sessionPromptプロパティには文字列を指定してください。`,
      ]
    );
  });

  it("config each file sessionIgnoreError not boolean", () => {
    error_case_test(
      "test/error_case/config_each_file_session_ignore_error_not_boolean",
      [
        `[zmce.config.yaml] 設定ファイルのarticles.file1.sessionIgnoreErrorプロパティにはtrue/falseを指定してください。`,
      ]
    );
  });

  it("config chapters not hash", () => {
    error_case_test("test/error_case/config_chapters_not_hash", [
      `[zmce.config.yaml] 設定ファイルのbooks.book_test.chaptersプロパティは連想配列(ハッシュ)で記載してください。`,
    ]);
  });
});

describe("zmce warn case", () => {
  beforeEach(() => (process.exitCode = 0));
  afterEach(() => {
    expect(spyInfo.mock.calls).toEqual([
      ["[zmce] 処理を開始します。"],
      [
        "[zmce] 処理を終了します。(変更有 0, 変更無 0, エラー有 1, 対象無 0, スキップ 0)",
      ],
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

  it("exec exit error", () => {
    inSpyCwd("test/warn_case/exec_exit_error", () => {
      setSpyChildProcess();
      zmce.main();
      expect(spyWarn.mock.calls).toEqual([
        [
          colors.yellow(
            "[articles/test01.md] exec 「aaa」コマンドに失敗しました。status: 127, message: [mock]Command failed: aaa\n/bin/sh: 1: aaa: command not found, stdout: , stderr: /bin/sh: 1: aaa: command not found\n"
          ),
        ],
      ]);
    });
  });

  it("session exit error", () => {
    inSpyCwd("test/warn_case/session_exit_error", () => {
      setSpyChildProcess();
      zmce.main();
      expect(spyWarn.mock.calls).toEqual([
        [
          colors.yellow(
            "[articles/test01.md] sessionの「aaa」コマンドに失敗しました。status: 127, message: [mock]Command failed: aaa\n/bin/sh: 1: aaa: command not found, stdout: , stderr: /bin/sh: 1: aaa: command not found\n"
          ),
        ],
      ]);
    });
  });
});

describe("zmce skip no file case", () => {
  beforeEach(() => (process.exitCode = 0));
  afterEach(() => {
    expect(spyInfo.mock.calls).toEqual([
      ["[zmce] 処理を開始します。"],
      [
        "[zmce] 処理を終了します。(変更有 0, 変更無 0, エラー有 0, 対象無 0, スキップ 0)",
      ],
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
});

describe("zmce skip file case", () => {
  beforeEach(() => (process.exitCode = 0));
  afterEach(() => {
    expect(spyWarn.mock.calls).toEqual([]);
    expect(spyError.mock.calls).toEqual([]);
    expect(spyWriteFileSync.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(0);
  });

  it("not exists replace code", () => {
    inSpyCwd("test/skip_case/not_exists_replace_code", () => {
      zmce.main();
    });
    expect(spyInfo.mock.calls).toEqual([
      ["[zmce] 処理を開始します。"],
      [
        "[zmce] 処理を終了します。(変更有 0, 変更無 0, エラー有 0, 対象無 1, スキップ 0)",
      ],
    ]);
  });

  it("not change md file", () => {
    inSpyCwd("test/skip_case/not_change_md_file", () => {
      zmce.main();
    });
    expect(spyInfo.mock.calls).toEqual([
      ["[zmce] 処理を開始します。"],
      [
        "[zmce] 処理を終了します。(変更有 0, 変更無 1, エラー有 0, 対象無 0, スキップ 0)",
      ],
    ]);
  });

  it("not change exec", () => {
    inSpyCwd("test/skip_case/not_change_exec", () => {
      zmce.main();
    });
  });

  it("not change session", () => {
    inSpyCwd("test/skip_case/not_change_session", () => {
      zmce.main();
    });
  });

  it("not exists end phrase", () => {
    inSpyCwd("test/skip_case/not_exists_end_phrase", () => {
      zmce.main();
    });
    expect(spyInfo.mock.calls).toEqual([
      ["[zmce] 処理を開始します。"],
      [
        "[zmce] 処理を終了します。(変更有 0, 変更無 0, エラー有 0, 対象無 1, スキップ 0)",
      ],
    ]);
  });

  it("config skip", () => {
    inSpyCwd("test/skip_case/config_skip", () => {
      zmce.main();
    });
    expect(spyInfo.mock.calls).toEqual([
      ["[zmce] 処理を開始します。"],
      [
        "[zmce] 処理を終了します。(変更有 0, 変更無 0, エラー有 0, 対象無 0, スキップ 3)",
      ],
    ]);
  });

  it("config each file skip", () => {
    inSpyCwd("test/skip_case/config_each_file_skip", () => {
      zmce.main();
    });
    expect(spyInfo.mock.calls).toEqual([
      ["[zmce] 処理を開始します。"],
      [
        "[zmce] 処理を終了します。(変更有 0, 変更無 0, エラー有 0, 対象無 0, スキップ 3)",
      ],
    ]);
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
      [
        `[zmce] 処理を終了します。(変更有 ${changeMdFiles.length}, 変更無 0, エラー有 0, 対象無 0, スキップ 0)`,
      ],
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

  it("config each file relativeRoot change for chapter", () => {
    normal_case_test(
      "test/normal_case/config_each_file_relative_root_change_for_chapter",
      ["books/book_test/test01.md", "books/book_test/test02.md"]
    );
  });

  it("config each file fenceStr change for book", () => {
    normal_case_test(
      "test/normal_case/config_each_file_fence_str_change_for_book",
      ["books/book_test/test01.md"]
    );
  });

  it("config each file fenceStr change for chapter", () => {
    normal_case_test(
      "test/normal_case/config_each_file_fence_str_change_for_chapter",
      ["books/book_test/test01.md", "books/book_test/test02.md"]
    );
  });

  it("config relative root blank", () => {
    normal_case_test("test/normal_case/config_relative_root_blank", [
      "articles/test01.md",
    ]);
  });

  it("config session prompt", () => {
    normal_case_test("test/normal_case/config_session_prompt", [
      "articles/test01.md",
    ]);
  });

  it("config session ignore error", () => {
    normal_case_test("test/normal_case/config_session_ignore_error", [
      "articles/test01.md",
    ]);
  });

  it("relative simple path for article", () => {
    normal_case_test("test/normal_case/relative_simple_path_for_article", [
      "articles/test01.md",
    ]);
  });

  it("relative children path for article", () => {
    normal_case_test("test/normal_case/relative_children_path_for_article", [
      "articles/test01.md",
    ]);
  });

  it("relative parent path for article", () => {
    normal_case_test("test/normal_case/relative_parent_path_for_article", [
      "articles/test01.md",
    ]);
  });

  it("relative simple path for book", () => {
    normal_case_test("test/normal_case/relative_simple_path_for_book", [
      "books/book_test/test01.md",
    ]);
  });

  it("relative children path for book", () => {
    normal_case_test("test/normal_case/relative_children_path_for_book", [
      "books/book_test/test01.md",
    ]);
  });

  it("relative parent path for book", () => {
    normal_case_test("test/normal_case/relative_parent_path_for_book", [
      "books/book_test/test01.md",
    ]);
  });

  // 環境依存のテストのたえめ、/tmp/下にテスト用のファイルを作成/削除する。
  it("abs path", () => {
    const tmpFile =
      "/tmp/zmce_test_abs_path_ff82cd5effa4f535a15d9eb87afbf47268c47f80.js";
    orgFsWriteFileSync(tmpFile, 'console.log("tmp_zmce_test_abs");', "utf8");
    normal_case_test("test/normal_case/abs_path", ["articles/test01.md"]);
    fs.removeSync(tmpFile);
  });

  it("exec", () => {
    normal_case_test("test/normal_case/exec", [
      "articles/test01.md",
    ]);
  });

  it("session", () => {
    normal_case_test("test/normal_case/session", [
      "articles/test01.md",
    ]);
  });

  it("session_multi", () => {
    normal_case_test("test/normal_case/session_multi", [
      "articles/test01.md",
    ]);
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
        [
          colors.cyan(
            "[books/book_test4/03_normal01.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/book_test4/05_normal02.md] コードブロックを修正しました。"
          ),
        ],
        [
          "[zmce] 処理を終了します。(変更有 11, 変更無 3, エラー有 9, 対象無 3, スキップ 5)",
        ],
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

describe("zmce description case", () => {
  beforeEach(() => (process.exitCode = 0));
  afterEach(() => {
    expect(spyWarn.mock.calls).toEqual([]);
    expect(spyError.mock.calls).toEqual([]);
    expect(process.exitCode).toBe(0);
  });

  it("relative path description", () => {
    inSpyCwd("test/description_case/relative_path_description/received", () => {
      zmce.main();
      expect(spyInfo.mock.calls).toEqual([
        ["[zmce] 処理を開始します。"],
        [
          colors.cyan(
            "[articles/sample_article.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/sample_book/example1.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/sample_book/example2.md] コードブロックを修正しました。"
          ),
        ],
        [
          `[zmce] 処理を終了します。(変更有 3, 変更無 0, エラー有 0, 対象無 0, スキップ 0)`,
        ],
      ]);
      expectWriteFileSync(
        join(cwd, "test/description_case/relative_path_description/received"),
        join(cwd, "test/description_case/relative_path_description/expected")
      );
    });
  });

  it("simple path description", () => {
    inSpyCwd("test/description_case/simple_path_description/received", () => {
      zmce.main();
      expect(spyInfo.mock.calls).toEqual([
        ["[zmce] 処理を開始します。"],
        [
          colors.cyan(
            "[articles/sample_article.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/sample_book/example1.md] コードブロックを修正しました。"
          ),
        ],
        [
          `[zmce] 処理を終了します。(変更有 2, 変更無 0, エラー有 0, 対象無 1, スキップ 0)`,
        ],
      ]);
      expectWriteFileSync(
        join(cwd, "test/description_case/simple_path_description/received"),
        join(cwd, "test/description_case/simple_path_description/expected")
      );
    });
  });

  // 以下は環境依存のコードの為コメントアウト
  /*
  it("abs path description", () => {
    inSpyCwd("test/description_case/abs_path_description/received", () => {
      zmce.main();
      expect(spyInfo.mock.calls).toEqual([
        ["[zmce] 処理を開始します。"],
        [
          colors.cyan(
            "[articles/sample_article.md] コードブロックを修正しました。"
          ),
        ],
        [
          `[zmce] 処理を終了します。(変更有 1, 変更無 0, エラー有 0, 対象無 0, スキップ 0)`,
        ],
      ]);
      expectWriteFileSync(
        join(cwd, "test/description_case/abs_path_description/received"),
        join(cwd, "test/description_case/abs_path_description/expected")
      );
    });
  });
*/

  it("config relative root", () => {
    inSpyCwd("test/description_case/config_relative_root/received", () => {
      zmce.main();
      expect(spyInfo.mock.calls).toEqual([
        ["[zmce] 処理を開始します。"],
        [
          colors.cyan(
            "[articles/fizzbuzz_article.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[articles/sample_article.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/sample_book/example1.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/sample_book/example2.md] コードブロックを修正しました。"
          ),
        ],
        [
          `[zmce] 処理を終了します。(変更有 4, 変更無 0, エラー有 0, 対象無 0, スキップ 0)`,
        ],
      ]);
      expectWriteFileSync(
        join(cwd, "test/description_case/config_relative_root/received"),
        join(cwd, "test/description_case/config_relative_root/expected")
      );
    });
  });

  // book -> article参照は本来であれば1回のコマンドで終るが、testはwriteをmocにしているため2回に分ける
  it("config fence str first", () => {
    inSpyCwd("test/description_case/config_fence_str_first/received", () => {
      zmce.main();
      expect(spyInfo.mock.calls).toEqual([
        ["[zmce] 処理を開始します。"],
        [
          colors.cyan(
            "[articles/sample_article.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/sample_book/example1.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/sample_book/example2.md] コードブロックを修正しました。"
          ),
        ],
        [
          `[zmce] 処理を終了します。(変更有 3, 変更無 0, エラー有 0, 対象無 0, スキップ 0)`,
        ],
      ]);
      expectWriteFileSync(
        join(cwd, "test/description_case/config_fence_str_first/received"),
        join(cwd, "test/description_case/config_fence_str_first/expected")
      );
    });
  });

  it("config fence str second", () => {
    inSpyCwd("test/description_case/config_fence_str_second/received", () => {
      zmce.main();
      expect(spyInfo.mock.calls).toEqual([
        ["[zmce] 処理を開始します。"],
        [
          colors.cyan(
            "[books/sample_book/example1.md] コードブロックを修正しました。"
          ),
        ],
        [
          `[zmce] 処理を終了します。(変更有 1, 変更無 2, エラー有 0, 対象無 0, スキップ 0)`,
        ],
      ]);
      expectWriteFileSync(
        join(cwd, "test/description_case/config_fence_str_second/received"),
        join(cwd, "test/description_case/config_fence_str_second/expected")
      );
    });
  });

  it("config skip", () => {
    inSpyCwd("test/description_case/config_skip/received", () => {
      zmce.main();
      expect(spyInfo.mock.calls).toEqual([
        ["[zmce] 処理を開始します。"],
        [
          colors.cyan(
            "[articles/normal_article.md] コードブロックを修正しました。"
          ),
        ],
        [
          colors.cyan(
            "[books/normal_book/normal_chapter.md] コードブロックを修正しました。"
          ),
        ],
        [
          `[zmce] 処理を終了します。(変更有 2, 変更無 0, エラー有 0, 対象無 0, スキップ 3)`,
        ],
      ]);
      expectWriteFileSync(
        join(cwd, "test/description_case/config_skip/received"),
        join(cwd, "test/description_case/config_skip/expected")
      );
    });
  });
});

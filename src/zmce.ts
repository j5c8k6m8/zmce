// ref: https://github.com/zenn-dev/zenn-editor/blob/master/packages/zenn-cli/utils/api/
import fs from "fs-extra";
import { basename, dirname, join } from "path";
import yaml from "js-yaml";
import colors from "colors/safe";

const articlesDirectoryName = "articles";
const booksDirectoryName = "books";
const configFileNameWithoutExtension = "zmce.config";
const defaultRelativeRoot = "submodules";
const defaultFenceStr = "```";
const defaultSkip = false;

type Config = {
  defaultFileConfig: FileConfig;
  articles: { [key: string]: FileConfig };
  books: { [key: string]: FileConfig };
  chapters: { [key: string]: FileConfig };
};

type FileConfig = {
  skip: boolean;
  relativeRoot: string;
  fenceStr: FenceStr;
};

type FenceStr = string;

function isFenceStr(arg: unknown): arg is FenceStr {
  return typeof arg === "string" && /^(````*|~~~~*)$/.test(arg);
}

type ResultCount = {
  change: number;
  noChange: number;
  noTarget: number;
  warn: number;
  skip: number;
};

export function main() {
  consoleInfoSimple(`[zmce] 処理を開始します。`);
  const cwd = process.cwd();
  const config = getConfig(cwd);
  const articleFiles = getArticleFiles(cwd);
  const chapterFiles = getChapterFiles(cwd);
  if (process.exitCode == 1) {
    consoleInfoSimple(
      `[zmce] エラーが発生したため、置換処理を行わずに終了します。`
    );
  } else {
    const rusultCount = {
      change: 0,
      noChange: 0,
      noTarget: 0,
      warn: 0,
      skip: 0,
    };
    articleFilesCodeEmbed(cwd, articleFiles, config, rusultCount);
    chapterFilesCodeEmbed(cwd, chapterFiles, config, rusultCount);
    consoleInfoSimple(
      `[zmce] 処理を終了します。(変更有 ${rusultCount.change}, 変更無 ${rusultCount.noChange}, エラー有 ${rusultCount.warn}, 対象無 ${rusultCount.noTarget}, スキップ ${rusultCount.skip})`
    );
  }
}

function getConfig(basePath: string): Config {
  let fileRaw = null;
  let configFileName = `${configFileNameWithoutExtension}.yaml`;
  try {
    fileRaw = fs.readFileSync(join(basePath, configFileName), "utf8");
  } catch (e) {
    try {
      let configFileName = `${configFileNameWithoutExtension}.yml`;
      fileRaw = fs.readFileSync(join(basePath, configFileName), "utf8");
    } catch (e) {}
  }
  return buildConfig(fileRaw, configFileName);
}

function buildConfig(arg: string | null, configFileName: string): Config {
  let fileConfig: any;
  let relativeRoot = defaultRelativeRoot;
  let fenceStr = defaultFenceStr;
  let skip = defaultSkip;
  const articles: { [key: string]: FileConfig } = {};
  const books: { [key: string]: FileConfig } = {};
  const chapters: { [key: string]: FileConfig } = {};
  if (arg) {
    try {
      fileConfig = yaml.safeLoad(arg);
    } catch (e) {
      consoleError(
        `[${configFileName}] 設定ファイルのフォーマットがyamlファイルとして不正です。`
      );
    }
  }
  if (isHash(fileConfig)) {
    if ("relativeRoot" in fileConfig) {
      if (typeof fileConfig.relativeRoot === "string") {
        relativeRoot = fileConfig.relativeRoot;
      } else {
        consoleError(
          `[${configFileName}] 設定ファイルのrelativeRootプロパティには文字列を指定してください。`
        );
      }
    }
    if ("fenceStr" in fileConfig) {
      if (isFenceStr(fileConfig.fenceStr)) {
        fenceStr = fileConfig.fenceStr;
      } else {
        consoleError(
          `[${configFileName}] 設定ファイルのfenceStrプロパティには「\`」もしくは「~」の連続した3文字以上の文字列を指定してください。`
        );
      }
    }
    if ("skip" in fileConfig) {
      if (typeof fileConfig.skip === "boolean") {
        skip = fileConfig.skip;
      } else {
        consoleError(
          `[${configFileName}] 設定ファイルのskipプロパティにはtrue/falseを指定してください。`
        );
      }
    }
    if ("articles" in fileConfig) {
      if (isHash(fileConfig.articles)) {
        for (let article in fileConfig.articles) {
          articles[article] = buildFileConfig(
            fileConfig.articles[article],
            relativeRoot,
            fenceStr,
            skip,
            `articles.${article}`,
            configFileName
          );
        }
      } else {
        consoleError(
          `[${configFileName}] 設定ファイルのarticlesプロパティは連想配列(ハッシュ)で記載してください。`
        );
      }
    }
    if ("books" in fileConfig) {
      if (isHash(fileConfig.books)) {
        for (let book in fileConfig.books) {
          books[book] = buildFileConfig(
            fileConfig.books[book],
            relativeRoot,
            fenceStr,
            skip,
            `books.${book}`,
            configFileName
          );
          if (isHash(fileConfig.books[book])) {
            if ("chapters" in fileConfig.books[book]) {
              if (isHash(fileConfig.books[book].chapters)) {
                for (let chapter in fileConfig.books[book].chapters) {
                  chapters[`${book}/${chapter}`] = buildFileConfig(
                    fileConfig.books[book].chapters[chapter],
                    books[book].relativeRoot,
                    books[book].fenceStr,
                    books[book].skip,
                    `books.${book}.chapters.${chapter}`,
                    configFileName
                  );
                }
              } else {
                consoleError(
                  `[${configFileName}] 設定ファイルのbooks.${book}.chaptersプロパティは連想配列(ハッシュ)で記載してください。`
                );
              }
            }
          }
        }
      } else {
        consoleError(
          `[${configFileName}] 設定ファイルのbooksプロパティは連想配列(ハッシュ)で記載してください。`
        );
      }
    }
  } else if (fileConfig != null) {
    consoleError(`[${configFileName}] 連想配列(ハッシュ)で記載してください。`);
  }
  return {
    defaultFileConfig: {
      relativeRoot: relativeRoot,
      fenceStr: fenceStr,
      skip: skip,
    },
    articles: articles,
    books: books,
    chapters: chapters,
  };
}

function buildFileConfig(
  arg: any,
  relativeRoot: string,
  fenceStr: FenceStr,
  skip: boolean,
  propertyName: string,
  configFileName: string
): FileConfig {
  if (isHash(arg)) {
    if ("relativeRoot" in arg) {
      if (typeof arg.relativeRoot === "string") {
        relativeRoot = arg.relativeRoot;
      } else {
        consoleError(
          `[${configFileName}] 設定ファイルの${propertyName}.relativeRootプロパティには文字列を指定してください。`
        );
      }
    }
    if ("fenceStr" in arg) {
      if (isFenceStr(arg.fenceStr)) {
        fenceStr = arg.fenceStr;
      } else {
        consoleError(
          `[${configFileName}] 設定ファイルの${propertyName}.fenceStrプロパティには「\`」もしくは「~」の連続した3文字以上の文字列を指定してください。`
        );
      }
    }
    if ("skip" in arg) {
      if (typeof arg.skip === "boolean") {
        skip = arg.skip;
      } else {
        consoleError(
          `[${configFileName}] 設定ファイルの${propertyName}.skipプロパティにはtrue/falseを指定してください。`
        );
      }
    }
  } else if (arg != null) {
    consoleError(
      `[${configFileName}] 設定ファイルの${propertyName}プロパティは連想配列(ハッシュ)で記載してください。`
    );
  }
  return {
    relativeRoot: relativeRoot,
    fenceStr: fenceStr,
    skip: skip,
  };
}

function isHash(arg: unknown) {
  return typeof arg == "object" && !Array.isArray(arg);
}

function getArticleFiles(basePath: string) {
  let articleFiles: string[] = [];
  try {
    const articleAllFiles = fs.readdirSync(
      join(basePath, articlesDirectoryName)
    );
    articleAllFiles.sort();
    articleFiles = articleAllFiles
      .filter((f) => f.match(/\.md$/))
      .map((f) => join(articlesDirectoryName, f));
  } catch (e) {
    consoleError(
      `プロジェクトルートに${articlesDirectoryName}ディレクトリがありません。`
    );
  }
  return articleFiles;
}

function getChapterFiles(basePath: string) {
  const chapterFiles: string[] = [];
  try {
    let allBookDirs = fs.readdirSync(join(basePath, booksDirectoryName));
    let bookDirs = allBookDirs.filter((f) => {
      try {
        return fs.statSync(join(basePath, booksDirectoryName, f)).isDirectory();
      } catch (e) {
        return false;
      }
    });
    bookDirs.forEach((bookDir) => {
      try {
        const bookChapterAllFiles = fs.readdirSync(
          join(basePath, booksDirectoryName, bookDir)
        );
        bookChapterAllFiles.sort();
        bookChapterAllFiles
          .filter((f) => f.match(/\.md$/))
          .forEach((f) =>
            chapterFiles.push(join(booksDirectoryName, bookDir, f))
          );
      } catch (e) {
        // ファイルの読み込み失敗は無視する
      }
    });
  } catch (e) {
    consoleError(
      `プロジェクトルートに${booksDirectoryName}ディレクトリがありません。`
    );
  }
  return chapterFiles;
}

function articleFilesCodeEmbed(
  basePath: string,
  articleFiles: string[],
  config: Config,
  resultCount: ResultCount
): void {
  articleFiles.forEach((f) => {
    let fileKey = basename(f, ".md");
    codeEmbed(
      basePath,
      f,
      config.articles[fileKey] || config.defaultFileConfig,
      resultCount
    );
  });
}

function chapterFilesCodeEmbed(
  basePath: string,
  chapterFiles: string[],
  config: Config,
  resultCount: ResultCount
): void {
  chapterFiles.forEach((f) => {
    let bookKey = basename(dirname(f));
    let chapterKey = `${bookKey}/${basename(f, ".md")}`;
    codeEmbed(
      basePath,
      f,
      config.chapters[chapterKey] ||
        config.books[bookKey] ||
        config.defaultFileConfig,
      resultCount
    );
  });
}
function codeEmbed(
  basePath: string,
  mdPath: string,
  fileConfig: FileConfig,
  resultCount: ResultCount
): void {
  if (fileConfig.skip) {
    resultCount.skip += 1;
    return;
  }
  let text;
  let targetFlg = false;
  let warnFlg = false;
  try {
    text = fs.readFileSync(join(basePath, mdPath), "utf8");
  } catch (e) {
    return;
  }
  let afterText = text.replace(
    getReplaceCodePattern(fileConfig.fenceStr),
    (
      match,
      beginMark,
      codeType,
      codeName,
      codePath,
      other,
      code,
      afterMark
    ) => {
      targetFlg = true;
      let afterCode;
      codePath = codePath.trim();
      const [codeAbsPath, codeRelativePath] = getCodeAbsRelativePath(
        basePath,
        fileConfig.relativeRoot,
        mdPath,
        codePath
      );
      try {
        afterCode = fs.readFileSync(codeAbsPath, "utf8");
      } catch (e) {
        consoleWarn(`[${mdPath}] 「${codeRelativePath}」ファイルがありません`);
        warnFlg = true;
        return match;
      }
      if (getCheckPattern(fileConfig.fenceStr).test(afterCode)) {
        consoleWarn(
          `[${mdPath}] 「${codeRelativePath}」ファイル内に使用できないパターン(^${fileConfig.fenceStr})が含まれています。`
        );
        warnFlg = true;
        return match;
      }
      return `${beginMark}${codeType}:${codeName}:${codePath}${other}\n${afterCode}\n${afterMark}`;
    }
  );
  if (!targetFlg) {
    resultCount.noTarget += 1;
  } else if (afterText != text) {
    fs.writeFileSync(join(basePath, mdPath), afterText, "utf8");
    consoleInfo(`[${mdPath}] コードブロックを修正しました。`);
    if (warnFlg) {
      resultCount.warn += 1;
    } else {
      resultCount.change += 1;
    }
  } else {
    if (warnFlg) {
      resultCount.warn += 1;
    } else {
      resultCount.noChange += 1;
    }
  }
}

function getReplaceCodePattern(fenceStr: string) {
  return new RegExp(
    `(^${fenceStr})([^${fenceStr[0]}:\n]*):([^:\n]*):([^:\n]+)(.*$)([^]*?)(^${fenceStr}$)`,
    "gm"
  );
}

function getCheckPattern(fenceStr: string) {
  return new RegExp(`^${fenceStr}`, "m");
}

function getCodeAbsRelativePath(
  basePath: string,
  relativeRoot: string,
  mdPath: string,
  codePath: string
): [string, string] {
  if (codePath.startsWith("/")) {
    return [codePath, codePath];
  } else if (/^(\.\/|\.\.\/)/.test(codePath)) {
    let mdDir = dirname(mdPath);
    return [join(basePath, mdDir, codePath), join(mdDir, codePath)];
  } else {
    return [
      join(basePath, relativeRoot, codePath),
      join(relativeRoot, codePath),
    ];
  }
}

function consoleError(msg: string): void {
  process.exitCode = 1;
  console.error(colors.red(msg));
}

function consoleWarn(msg: string): void {
  console.warn(colors.yellow(msg));
}

function consoleInfo(msg: string): void {
  console.info(colors.cyan(msg));
}

function consoleInfoSimple(msg: string): void {
  console.info(msg);
}

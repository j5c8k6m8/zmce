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

type Config = {
  defaultFileConfig: FileConfig;
  articles: { [key: string]: FileConfig };
  books: { [key: string]: FileConfig };
};

type FileConfig = {
  relativeRoot: string;
  fenceStr: FenceStr;
};

type FenceStr = string;

function isFenceStr(arg: unknown): arg is FenceStr {
  return typeof arg === "string" && /^(````*|~~~~*)$/.test(arg);
}

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
    articleFilesCodeEmbed(cwd, articleFiles, config);
    chapterFilesCodeEmbed(cwd, chapterFiles, config);
    consoleInfoSimple(`[zmce] 処理を終了します。`);
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
  const articles: { [key: string]: FileConfig } = {};
  const books: { [key: string]: FileConfig } = {};
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
          `[${configFileName}] 設定ファイルのfenceStrプロパティには「*」もしくは「~」の連続した3文字以上の文字列を指定してください。`
        );
      }
    }
    if ("articles" in fileConfig) {
      if (isHash(fileConfig.articles)) {
        for (let key in fileConfig.articles) {
          articles[key] = buildFileConfig(
            fileConfig.articles[key],
            relativeRoot,
            fenceStr,
            `articles.${key}`,
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
        for (let key in fileConfig.books) {
          books[key] = buildFileConfig(
            fileConfig.books[key],
            relativeRoot,
            fenceStr,
            `books.${key}`,
            configFileName
          );
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
    },
    articles: articles,
    books: books,
  };
}

function buildFileConfig(
  arg: any,
  relativeRoot: string,
  fenceStr: FenceStr,
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
          `[${configFileName}] 設定ファイルの${propertyName}.fenceStrプロパティには「*」もしくは「~」の連続した3文字以上の文字列を指定してください。`
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
  config: Config
): void {
  articleFiles.forEach((f) => {
    let fileKey = basename(f, ".md");
    codeEmbed(
      basePath,
      f,
      config.articles[fileKey] || config.defaultFileConfig
    );
  });
}

function chapterFilesCodeEmbed(
  basePath: string,
  chapterFiles: string[],
  config: Config
): void {
  chapterFiles.forEach((f) => {
    let fileKey = basename(dirname(f));
    codeEmbed(basePath, f, config.books[fileKey] || config.defaultFileConfig);
  });
}
function codeEmbed(
  basePath: string,
  mdPath: string,
  fileConfig: FileConfig
): void {
  let text;
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
      let afterCode;
      codePath = codePath.trim();
      const [codeAbsPath, codeRelativePath] = getCodeAbsRelativePath(
        basePath,
        fileConfig.relativeRoot,
        mdPath,
        codePath
      );
      try {
        afterCode = fs.readFileSync(
          codeAbsPath,
          "utf8"
        );
      } catch (e) {
        consoleWarn(
          `[${mdPath}] 「${codeRelativePath}」ファイルがありません`
        );
        return match;
      }
      if (getCheckPattern(fileConfig.fenceStr).test(afterCode)) {
        consoleWarn(
          `[${mdPath}] 「${codeRelativePath}」ファイル内に使用できないパターン(^${
            fileConfig.fenceStr
          })が含まれています。`
        );
        return match;
      }
      return `${beginMark}${codeType}:${codeName}:${codePath}${other}\n${afterCode}\n${afterMark}`;
    }
  );
  if (afterText != text) {
    fs.writeFileSync(join(basePath, mdPath), afterText, "utf8");
    consoleInfo(`[${mdPath}] コードブロックを修正しました。`);
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
  if (codePath.startsWith('/')) {
    return [codePath, codePath];
  } else if(/^(\.\/|\.\.\/)/.test(codePath)) {
    let mdDir = dirname(mdPath)
    return [join(basePath, mdDir, codePath), join(mdDir, codePath)];
  } else {
    return [join(basePath, relativeRoot, codePath), join(relativeRoot, codePath)];
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

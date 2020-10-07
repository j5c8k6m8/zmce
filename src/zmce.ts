// ref: https://github.com/zenn-dev/zenn-editor/blob/master/packages/zenn-cli/utils/api/
import fs from "fs-extra";
import { join } from "path";
import colors from "colors/safe";

const articlesDirectoryName = "articles";
const booksDirectoryName = "books";
const modulesDirectoryName = "submodules";
const replaceCodeSymbol = "```";
const replaceCodePattern = new RegExp(`(^${replaceCodeSymbol})([^:\n]*):([^:\n]*):([^:\n]+)(.*$)([^]*?)(^${replaceCodeSymbol}$)`, 'gm');
const checkPattern = new RegExp(`^${replaceCodeSymbol}`, 'm');
const mdRegex = /\.md$/;

export function main() {
  console.info(colors.cyan(`[START] zmce`));

  try {
    fs.readdirSync(join(process.cwd(), modulesDirectoryName));
  } catch (e) {
    console.error(
      colors.red(
        `プロジェクトルートに${modulesDirectoryName}ディレクトリを作成してください`
      )
    );
    process.exitCode = 1;
  }

  let articleFiles;
  try {
    const articleAllFiles = fs.readdirSync(
      join(process.cwd(), articlesDirectoryName)
    );
    articleAllFiles.sort();
    articleFiles = articleAllFiles
      .filter((f) => f.match(mdRegex))
      .map((f) => join(articlesDirectoryName, f));
  } catch (e) {
    console.error(
      colors.red(
        `プロジェクトルートに${articlesDirectoryName}ディレクトリを作成してください`
      )
    );
    process.exitCode = 1;
  }

  const chapterFiles: string[] = [];
  try {
    let allBookDirs = fs.readdirSync(join(process.cwd(), booksDirectoryName));
    let bookDirs = allBookDirs.filter((f) => {
      try {
        return fs
          .statSync(join(process.cwd(), booksDirectoryName, f))
          .isDirectory();
      } catch (e) {
        return false;
      }
    });
    bookDirs.forEach((bookDir) => {
      try {
        const bookChapterAllFiles = fs.readdirSync(
          join(process.cwd(), booksDirectoryName, bookDir)
        );
        bookChapterAllFiles.sort();
        bookChapterAllFiles
          .filter((f) => f.match(mdRegex))
          .forEach((f) =>
            chapterFiles.push(join(booksDirectoryName, bookDir, f))
          );
      } catch (e) {
        // ファイルの読み込み失敗は無視する
      }
    });
  } catch (e) {
    console.error(
      colors.red(
        `プロジェクトルートに${booksDirectoryName}ディレクトリを作成してください`
      )
    );
    process.exitCode = 1;
  }

  if (process.exitCode == 1) {
    console.info(colors.cyan(`[ END ] zmce`));
  } else {
    const codeEmbed = (relativePath: string) => {
      let text;
      try {
        text = fs.readFileSync(join(process.cwd(), relativePath), "utf8");
      } catch (e) {
        return;
      }
      let afterText = text.replace(
        replaceCodePattern,
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
          try {
            afterCode = fs.readFileSync(
              join(process.cwd(), modulesDirectoryName, codePath.trim()),
              "utf8"
            );
          } catch (e) {
            console.warn(
              colors.yellow(
                `[${relativePath}] モジュールディレクトリに「${codePath.trim()}」ファイルがありません`
              )
            );
            return match;
          }
          if (checkPattern.test(afterCode)) {
            console.warn(
              colors.yellow(
                `[${relativePath}] 「${codePath.trim()}」ファイル内に使用できないパターン(^${replaceCodeSymbol})が含まれています。`
              )
            );
            return match;
          }
          return `${beginMark}${codeType}:${codeName}:${codePath}${other}\n${afterCode}\n${afterMark}`;
        }
      );
      if (afterText != text) {
        fs.writeFileSync(join(process.cwd(), relativePath), afterText, "utf8");
        console.info(`[${relativePath}] コードブロックを修正しました。`);
      }
    };
    articleFiles?.forEach((f) => codeEmbed(f));
    chapterFiles.forEach((f) => codeEmbed(f));
    console.info(colors.cyan(`[ END ] zmce`));
  }
}

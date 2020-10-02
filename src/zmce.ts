// ref: https://github.com/zenn-dev/zenn-editor/blob/master/packages/zenn-cli/utils/api/articles.ts
import fs from "fs-extra";
import { join } from "path";
import colors from "colors/safe";

const articlesDirectoryName = "articles";
const modulesDirectoryName = "submodules";
const replaceCodePattern = /(^````*)([^:\n]*):([^:\n]*):([^:\n]+)(.*$)([^]*?)(^```$)/gm;
const replaceEscapePattern = /^```/gm;
const replaceEscapeValue = '\\```';
const mdRegex = /\.md$/;

export function main () {
  console.info(colors.cyan(`[START] zmce`));

  const articlesDirectory = join(process.cwd(), articlesDirectoryName);
  const modulesDirectory = join(process.cwd(), modulesDirectoryName);
  
  let allFiles;
  try {
    allFiles = fs.readdirSync(articlesDirectory);
    allFiles.sort();
  } catch (e) {
    console.error(
      colors.red(
        `プロジェクトルートに${articlesDirectoryName}ディレクトリを作成してください`
      )
    );
    process.exitCode = 1;
  }
  
  try {
    fs.readdirSync(modulesDirectory);
  } catch (e) {
    console.error(
      colors.red(
        `プロジェクトルートに${modulesDirectoryName}ディレクトリを作成してください`
      )
    );
    process.exitCode = 1;
  }
  
  if (process.exitCode == 1) {
    console.info(colors.cyan(`[ END ] zmce`));
  } else {
    allFiles?.filter((f) => f.match(mdRegex)).forEach((file) => {
      let text;
      try {
        text = fs.readFileSync(join(articlesDirectory, file), "utf8");
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
              join(modulesDirectory, codePath.trim()),
              "utf8"
            );
          } catch (e) {
            console.warn(
              colors.yellow(
                `[${join(articlesDirectoryName, file)}] モジュールディレクトリに「${codePath.trim()}」ファイルがありません`
              )
            );
            return match;
          }
          afterCode = afterCode.replace(replaceEscapePattern, replaceEscapeValue);
          return `${beginMark}${codeType}:${codeName}:${codePath}${other}\n${afterCode}\n${afterMark}`;
        }
      );
      if (afterText != text) {
        fs.writeFileSync(join(articlesDirectory, file), afterText, "utf8");
        console.info(`${file}のコードブロックを修正しました。`);
      }
    });  
    console.info(colors.cyan(`[ END ] zmce`));
  }
}

export class DocumentParser {
  public static parseBlocks(document: string): string[] {
    const delimiter = this.getDelimter();
    const blocks: string[] = [];
    let lastLineLength: number;
    const context = {
      inSingleQuoteString: false,
      inDoubleQuoteString: false,
      inComment: false,
      sql: '',
      start: false,
      ignoreDelimiter:false,
      lastWord:''
    };
    const batchSql = document.split(/\n/g);
    const lineCount = batchSql.length;
    for (var i = 0; i < lineCount; i++) {
      var text = batchSql[i];
      if (!text) continue;
      lastLineLength = text.length;
      for (let j = 0; j < text.length; j++) {
        const ch = text.charAt(j);
        // comment check
        if (ch === '*' && text.charAt(j + 1) == '/') {
          j++;
          context.inComment = false;
          continue;
        }
        if (context.inComment) continue;
        // string check
        if (ch == `'`) {
          context.inSingleQuoteString = !context.inSingleQuoteString;
        } else if (ch == `"`) {
          context.inDoubleQuoteString = !context.inDoubleQuoteString;
        }
        const inString = context.inSingleQuoteString || context.inDoubleQuoteString;
        if (!inString) {
          // line comment
          if (ch === '-' && text.charAt(j + 1) === '-') break;
          if (ch === '/' && text.charAt(j + 1) === '/') break;
          // block comment start
          if (ch === '/' && text.charAt(j + 1) === '*') {
            j++;
            context.inComment = true;
            continue;
          }
          // check 存储过程中的begin
          if(context.lastWord.match(/begin/i)){
            context.ignoreDelimiter = true;
          }
          if(context.lastWord.match(/end/i)){
            context.ignoreDelimiter = false;
          }
          // check sql end
          if (ch === delimiter && !context.ignoreDelimiter) {
            blocks.push(context.sql);
            context.sql = '';
            context.start = false;
            continue;
          }
        }

        if (!context.start) {
          if (ch.match(/\s/)) continue;
          context.start = true;
        }
        if (ch.match(/\s/)){
          context.lastWord = '';
        }
        context.sql = context.sql + ch;
        context.lastWord = context.lastWord+ch;

      }
      if (context.sql) {
        context.sql = context.sql + '\n';
      }
    }
    // if end withtout delimter
    if (context.start) {
      const block = context.sql;
      blocks.push(block);
    }
    return blocks;
  }

  private static getDelimter() {
    return ';';
  }
}

function test1() {
  const sql1 = `CREATE PROCEDURE InsertEmployee(IN pFirstName VARCHAR(50), IN pLastName VARCHAR(50), IN pHireDate DATE)
BEGIN
    DECLARE v_employee_id INT;

    INSERT INTO employees (first_name, last_name, hire_date)
    VALUES (pFirstName, pLastName, pHireDate);

    SET v_employee_id = LAST_INSERT_ID();

    SELECT v_employee_id AS 'NewEmployeeID';
END;

DELETE FROM \`test\`.\`students\` WHERE id = 11 ;

create database hive;

`;
  const sql2 = `DELIMITER $$

CREATE PROCEDURE InsertEmployee(IN pFirstName VARCHAR(50), IN pLastName VARCHAR(50), IN pHireDate DATE)
BEGIN
    DECLARE v_employee_id INT;

    INSERT INTO employees (first_name, last_name, hire_date)
    VALUES (pFirstName, pLastName, pHireDate);

    SET v_employee_id = LAST_INSERT_ID();

    SELECT v_employee_id AS 'NewEmployeeID';
END$$

DELIMITER ;

create database hive;
`
console.log(DocumentParser.parseBlocks(sql2));

}

test1()

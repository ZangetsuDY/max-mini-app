import crypto from "node:crypto";

const [
  ,
  ,
  usernameArg,
  fullNameArg,
  passwordArg
] = process.argv;

if (
  !usernameArg ||
  !fullNameArg ||
  !passwordArg
) {
  console.log(`
Использование:

node scripts/make-user.mjs LOGIN "ФИО" "ПАРОЛЬ"

Пример:

node scripts/make-user.mjs ivanov "Иванов Иван Иванович" "MyStrongPassword123!"
`);
  process.exit(1);
}

const username =
  String(usernameArg).trim();

const fullName =
  String(fullNameArg).trim();

const password =
  String(passwordArg);

if (password.length < 10) {
  console.error(
    "Пароль должен содержать хотя бы 10 символов."
  );
  process.exit(1);
}

const iterations = 210000;

const salt = crypto
  .randomBytes(16)
  .toString("hex");

const passwordHash = crypto
  .pbkdf2Sync(
    password,
    salt,
    iterations,
    32,
    "sha256"
  )
  .toString("hex");

const user = {
  username,
  fullName,
  salt,
  passwordHash,
  iterations
};

console.log("\nДобавьте этот объект в APP_USERS_JSON:\n");
console.log(
  JSON.stringify(
    user,
    null,
    2
  )
);
console.log();

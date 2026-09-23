import crypto from "node:crypto";

const [
  ,
  ,
  usernameArg,
  fullNameArg,
  passwordArg,
  roleArg = "user"
] = process.argv;

if (
  !usernameArg ||
  !fullNameArg ||
  !passwordArg
) {
  console.log(`
Использование:

node scripts/make-user.mjs LOGIN "ФИО" "ПАРОЛЬ" ROLE

ROLE:
  user        — обычный пользователь
  dispatcher  — диспетчер

Примеры:

node scripts/make-user.mjs ivanov "Иванов Иван Иванович" "MyStrongPassword123!" user

node scripts/make-user.mjs petrov "Петров Пётр Петрович" "MyStrongPassword123!" dispatcher
`);
  process.exit(1);
}

const username =
  String(usernameArg).trim();

const fullName =
  String(fullNameArg).trim();

const password =
  String(passwordArg);

const role =
  String(roleArg)
    .trim()
    .toLowerCase();

const dispatcherValues = new Set([
  "dispatcher",
  "disp",
  "true",
  "1",
  "yes",
  "да"
]);

const regularValues = new Set([
  "user",
  "false",
  "0",
  "no",
  "нет"
]);

if (
  !dispatcherValues.has(role) &&
  !regularValues.has(role)
) {
  console.error(
    'ROLE должен быть "user" или "dispatcher".'
  );
  process.exit(1);
}

if (password.length < 10) {
  console.error(
    "Пароль должен содержать хотя бы 10 символов."
  );
  process.exit(1);
}

const isDispatcher =
  dispatcherValues.has(role);

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
  isDispatcher,
  salt,
  passwordHash,
  iterations
};

console.log(
  `\nРоль: ${
    isDispatcher
      ? "ДИСПЕТЧЕР"
      : "ПОЛЬЗОВАТЕЛЬ"
  }\n`
);

console.log(
  "Добавьте этот объект в APP_USERS_JSON:\n"
);

console.log(
  JSON.stringify(
    user,
    null,
    2
  )
);

console.log();

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
  user                  — обычный пользователь
  dispatcher            — диспетчер
  developer             — разработчик
  developer-dispatcher  — разработчик + диспетчер

Примеры:

node scripts/make-user.mjs ivanov "Иванов Иван Иванович" "StrongPassword123!" user

node scripts/make-user.mjs petrov "Петров Пётр Петрович" "StrongPassword123!" dispatcher

node scripts/make-user.mjs dev "Разработчик Системы" "StrongPassword123!" developer
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

const allowed =
  new Set([
    "user",
    "dispatcher",
    "developer",
    "developer-dispatcher"
  ]);

if (!allowed.has(role)) {
  console.error(
    'ROLE должен быть user, dispatcher, developer или developer-dispatcher.'
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
  role === "dispatcher" ||
  role === "developer-dispatcher";

const isDeveloper =
  role === "developer" ||
  role === "developer-dispatcher";

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
  isDeveloper,
  salt,
  passwordHash,
  iterations
};

console.log(
  `\nРоль: ${role}\n`
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

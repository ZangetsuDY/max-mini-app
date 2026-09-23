import crypto from "node:crypto";

import {
  getConfiguredUsers,
  getConfiguredUser
} from "./security.js";

import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

const ACCESS_PREFIX =
  "lenenergo:max-mini-app:access";

const CUSTOM_ROLES_KEY =
  `${ACCESS_PREFIX}:roles`;

function userRolesKey(username) {
  return (
    `${ACCESS_PREFIX}:user-roles:` +
    String(username || "")
      .trim()
      .toLowerCase()
  );
}

/*
  ЕДИНЫЙ РЕЕСТР ПАНЕЛЕЙ.

  Когда в будущем добавляется новая панель Mini App,
  достаточно зарегистрировать её здесь. Редактор ролей
  автоматически получит её через API и покажет новый пункт
  без переписывания формы ролей.
*/
export const PANEL_REGISTRY = Object.freeze([
  {
    id: "monitoring",
    name: "Аварийный мониторинг",
    description:
      "Просмотр оперативных аварийных отключений и состояния подразделений.",
    category: "Оперативная работа"
  },
  {
    id: "dispatcher",
    name: "Интерфейс Диспетчера",
    description:
      "Специализированное рабочее место оперативно-диспетчерского персонала.",
    category: "Оперативная работа"
  },
  {
    id: "system-control",
    name: "Центр управления системой",
    description:
      "Режим работы Mini App, пользовательские сессии и эксплуатационная диагностика.",
    category: "Администрирование"
  }
]);

export const DISPATCHER_RES_REGISTRY = Object.freeze([
  {
    id: "ves",
    name: "ВЭС",
    description:
      "Выборгские электрические сети"
  },
  {
    id: "yues",
    name: "ЮЭС",
    description:
      "Южные электрические сети"
  },
  {
    id: "gtes",
    name: "ГтЭС",
    description:
      "Гатчинские электрические сети"
  }
]);

const BUILTIN_ROLES = Object.freeze([
  {
    id: "user",
    name: "Пользователь",
    description:
      "Базовый доступ к аварийному мониторингу.",
    panelIds: [
      "monitoring"
    ],
    dispatcherDivisionId: "",
    builtin: true,
    protected: true
  },
  {
    id: "dispatcher",
    name: "Диспетчер",
    description:
      "Аварийный мониторинг и интерфейс диспетчера.",
    panelIds: [
      "monitoring",
      "dispatcher"
    ],
    dispatcherDivisionId: "",
    builtin: true,
    protected: true
  },
  {
    id: "developer",
    name: "Разработчик",
    description:
      "Аварийный мониторинг, центр управления системой и управление ролями.",
    panelIds: [
      "monitoring",
      "system-control"
    ],
    dispatcherDivisionId: "",
    builtin: true,
    protected: true
  }
]);

function safeParse(
  value,
  fallback
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function sanitizePanelIds(panelIds) {
  const allowed =
    new Set(
      PANEL_REGISTRY.map(
        (panel) => panel.id
      )
    );

  return [
    ...new Set(
      (Array.isArray(panelIds)
        ? panelIds
        : []
      )
        .map(
          (value) =>
            String(value || "")
              .trim()
        )
        .filter(
          (value) =>
            allowed.has(value)
        )
    )
  ];
}

function sanitizeDispatcherDivisionId(
  value
) {
  const clean =
    String(value || "")
      .trim()
      .toLowerCase();

  if (!clean) {
    return "";
  }

  const allowed =
    new Set(
      DISPATCHER_RES_REGISTRY.map(
        (division) => division.id
      )
    );

  return allowed.has(clean)
    ? clean
    : "";
}

function dispatcherDivisionNameById(
  divisionId
) {
  return (
    DISPATCHER_RES_REGISTRY.find(
      (division) =>
        division.id === divisionId
    )?.name || ""
  );
}

function normalizeRole(role) {
  if (!role) {
    return null;
  }

  const id =
    String(role.id || "")
      .trim()
      .toLowerCase();

  const name =
    String(role.name || "")
      .trim();

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name:
      name.slice(0, 80),
    description:
      String(
        role.description || ""
      )
        .trim()
        .slice(0, 300),
    panelIds:
      sanitizePanelIds(
        role.panelIds
      ),
    dispatcherDivisionId:
      sanitizeDispatcherDivisionId(
        role.dispatcherDivisionId
      ),
    dispatcherDivisionName:
      dispatcherDivisionNameById(
        sanitizeDispatcherDivisionId(
          role.dispatcherDivisionId
        )
      ),
    builtin:
      Boolean(role.builtin),
    protected:
      Boolean(role.protected),
    createdAt:
      role.createdAt || null,
    updatedAt:
      role.updatedAt || null,
    updatedBy:
      role.updatedBy || null
  };
}

function defaultRoleIdsForUser(user) {
  const roleIds =
    ["user"];

  if (user?.isDispatcher) {
    roleIds.push(
      "dispatcher"
    );
  }

  if (user?.isDeveloper) {
    roleIds.push(
      "developer"
    );
  }

  return [
    ...new Set(roleIds)
  ];
}

export async function getRoleDefinitions() {
  let customRoles = [];

  if (
    isRuntimeStoreConfigured()
  ) {
    try {
      const raw =
        await redisCommand(
          "GET",
          CUSTOM_ROLES_KEY
        );

      const parsed =
        safeParse(
          raw,
          []
        );

      if (
        Array.isArray(parsed)
      ) {
        customRoles =
          parsed
            .map(
              normalizeRole
            )
            .filter(Boolean)
            .map(
              (role) => ({
                ...role,
                builtin: false,
                protected: false
              })
            );
      }
    } catch (error) {
      console.error(
        "Не удалось загрузить пользовательские роли:",
        error
      );
    }
  }

  const builtin =
    BUILTIN_ROLES.map(
      (role) => ({
        ...role,
        /*
          Системная роль «Разработчик» всегда получает доступ ко всем
          зарегистрированным панелям. Поэтому при добавлении новой панели
          в PANEL_REGISTRY она автоматически появляется у разработчика
          без ручного редактирования роли.
        */
        panelIds:
          role.id === "developer"
            ? PANEL_REGISTRY.map(
                (panel) => panel.id
              )
            : [...role.panelIds]
      })
    );

  const builtinIds =
    new Set(
      builtin.map(
        (role) => role.id
      )
    );

  return [
    ...builtin,
    ...customRoles.filter(
      (role) =>
        !builtinIds.has(
          role.id
        )
    )
  ];
}

async function saveCustomRoles(
  roles
) {
  if (
    !isRuntimeStoreConfigured()
  ) {
    throw new Error(
      "Хранилище состояния не подключено"
    );
  }

  const custom =
    (roles || [])
      .filter(
        (role) =>
          !role.builtin
      )
      .map(
        normalizeRole
      )
      .filter(Boolean);

  await redisCommand(
    "SET",
    CUSTOM_ROLES_KEY,
    JSON.stringify(custom)
  );
}

export async function getUserRoleIds(
  username,
  configuredUser = null,
  roleDefinitions = null
) {
  const user =
    configuredUser ||
    getConfiguredUser(
      username
    );

  if (!user) {
    return [];
  }

  const roles =
    roleDefinitions ||
    await getRoleDefinitions();

  const validRoleIds =
    new Set(
      roles.map(
        (role) =>
          role.id
      )
    );

  if (
    isRuntimeStoreConfigured()
  ) {
    try {
      const raw =
        await redisCommand(
          "GET",
          userRolesKey(
            user.username
          )
        );

      const assignment =
        safeParse(
          raw,
          null
        );

      if (
        assignment &&
        Array.isArray(
          assignment.roleIds
        )
      ) {
        const assigned =
          [
            ...new Set(
              assignment.roleIds
                .map(
                  (roleId) =>
                    String(
                      roleId || ""
                    )
                      .trim()
                      .toLowerCase()
                )
                .filter(
                  (roleId) =>
                    validRoleIds.has(
                      roleId
                    )
                )
            )
          ];

        if (assigned.length) {
          return assigned;
        }
      }
    } catch (error) {
      console.error(
        "Не удалось загрузить назначение ролей:",
        error
      );
    }
  }

  return defaultRoleIdsForUser(
    user
  ).filter(
    (roleId) =>
      validRoleIds.has(
        roleId
      )
  );
}

function buildAccessResult(
  user,
  roleIds,
  roles
) {
  const roleMap =
    new Map(
      roles.map(
        (role) => [
          role.id,
          role
        ]
      )
    );

  const effectiveRoles =
    roleIds
      .map(
        (roleId) =>
          roleMap.get(roleId)
      )
      .filter(Boolean);

  const isDeveloper =
    roleIds.includes(
      "developer"
    );

  /*
    Разработчик — системная super-role.
    Даже если сохранённое определение роли устарело, разработчик всегда
    получает все панели из актуального PANEL_REGISTRY. Это также означает,
    что будущие панели автоматически становятся доступны разработчику.
  */
  const panelIds =
    isDeveloper
      ? PANEL_REGISTRY.map(
          (panel) => panel.id
        )
      : [
          ...new Set(
            effectiveRoles.flatMap(
              (role) =>
                role.panelIds || []
            )
          )
        ];

  const dispatcherRole =
    effectiveRoles.find(
      (role) =>
        role.panelIds?.includes(
          "dispatcher"
        ) &&
        role.dispatcherDivisionId
    ) || null;

  const dispatcherDivisionId =
    dispatcherRole?.dispatcherDivisionId || "";

  const dispatcherDivisionName =
    dispatcherDivisionNameById(
      dispatcherDivisionId
    );

  return {
    username:
      String(
        user?.username || ""
      ),
    fullName:
      String(
        user?.fullName ||
        user?.username ||
        ""
      ),
    roleIds,
    roles:
      effectiveRoles.map(
        (role) => ({
          id: role.id,
          name: role.name,
          builtin:
            Boolean(
              role.builtin
            ),
          dispatcherDivisionId:
            role.dispatcherDivisionId || "",
          dispatcherDivisionName:
            dispatcherDivisionNameById(
              role.dispatcherDivisionId || ""
            )
        })
      ),
    roleNames:
      effectiveRoles.map(
        (role) =>
          role.name
      ),
    panelIds,
    isDeveloper,
    isDispatcher:
      panelIds.includes(
        "dispatcher"
      ),
    canManageRoles:
      isDeveloper,
    dispatcherDivisionId,
    dispatcherDivisionName,
    dispatcherAvailableDivisionIds:
      DISPATCHER_RES_REGISTRY.map(
        (division) => division.id
      )
  };
}

export async function resolveUserAccess(
  userOrUsername
) {
  const user =
    typeof userOrUsername ===
    "string"
      ? getConfiguredUser(
          userOrUsername
        )
      : getConfiguredUser(
          userOrUsername?.username
        ) ||
        userOrUsername;

  if (!user?.username) {
    return null;
  }

  const roles =
    await getRoleDefinitions();

  const roleIds =
    await getUserRoleIds(
      user.username,
      user,
      roles
    );

  return buildAccessResult(
    user,
    roleIds,
    roles
  );
}

export async function resolveSessionAccess(
  session
) {
  if (!session?.username) {
    return null;
  }

  return resolveUserAccess(
    session.username
  );
}

export function hasPanel(
  access,
  panelId
) {
  return Boolean(
    access?.panelIds?.includes(
      panelId
    )
  );
}

export async function getUsersWithAccess() {
  const configuredUsers =
    getConfiguredUsers();

  const roles =
    await getRoleDefinitions();

  return Promise.all(
    configuredUsers.map(
      async (user) => {
        const roleIds =
          await getUserRoleIds(
            user.username,
            user,
            roles
          );

        return buildAccessResult(
          user,
          roleIds,
          roles
        );
      }
    )
  );
}

function makeCustomRoleId() {
  return (
    "custom-" +
    crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 16)
  );
}

export async function createRole({
  name,
  description = "",
  panelIds = [],
  dispatcherDivisionId = "",
  actor
}) {
  const cleanName =
    String(name || "")
      .trim()
      .slice(0, 80);

  if (!cleanName) {
    throw new Error(
      "Укажите название роли"
    );
  }

  const roles =
    await getRoleDefinitions();

  if (
    roles.some(
      (role) =>
        role.name
          .trim()
          .toLowerCase() ===
        cleanName.toLowerCase()
    )
  ) {
    throw new Error(
      "Роль с таким названием уже существует"
    );
  }

  const cleanPanelIds =
    sanitizePanelIds(
      panelIds
    );

  const cleanDispatcherDivisionId =
    cleanPanelIds.includes(
      "dispatcher"
    )
      ? sanitizeDispatcherDivisionId(
          dispatcherDivisionId
        )
      : "";

  const now =
    new Date().toISOString();

  const role = {
    id:
      makeCustomRoleId(),
    name:
      cleanName,
    description:
      String(
        description || ""
      )
        .trim()
        .slice(0, 300),
    panelIds:
      cleanPanelIds,
    dispatcherDivisionId:
      cleanDispatcherDivisionId,
    builtin: false,
    protected: false,
    createdAt: now,
    updatedAt: now,
    updatedBy: {
      username:
        String(
          actor?.username || ""
        ),
      fullName:
        String(
          actor?.fullName || ""
        )
    }
  };

  await saveCustomRoles([
    ...roles.filter(
      (item) =>
        !item.builtin
    ),
    role
  ]);

  return role;
}

export async function updateRole({
  roleId,
  name,
  description = "",
  panelIds = [],
  dispatcherDivisionId = "",
  actor
}) {
  const id =
    String(roleId || "")
      .trim()
      .toLowerCase();

  const roles =
    await getRoleDefinitions();

  const current =
    roles.find(
      (role) =>
        role.id === id
    );

  if (!current) {
    throw new Error(
      "Роль не найдена"
    );
  }

  if (current.builtin) {
    throw new Error(
      "Системные роли нельзя изменять"
    );
  }

  const cleanName =
    String(name || "")
      .trim()
      .slice(0, 80);

  if (!cleanName) {
    throw new Error(
      "Укажите название роли"
    );
  }

  if (
    roles.some(
      (role) =>
        role.id !== id &&
        role.name
          .trim()
          .toLowerCase() ===
        cleanName.toLowerCase()
    )
  ) {
    throw new Error(
      "Роль с таким названием уже существует"
    );
  }

  const cleanPanelIds =
    sanitizePanelIds(
      panelIds
    );

  const cleanDispatcherDivisionId =
    cleanPanelIds.includes(
      "dispatcher"
    )
      ? sanitizeDispatcherDivisionId(
          dispatcherDivisionId
        )
      : "";

  const custom =
    roles
      .filter(
        (role) =>
          !role.builtin
      )
      .map(
        (role) =>
          role.id === id
            ? {
                ...role,
                name:
                  cleanName,
                description:
                  String(
                    description ||
                    ""
                  )
                    .trim()
                    .slice(0, 300),
                panelIds:
                  cleanPanelIds,
                dispatcherDivisionId:
                  cleanDispatcherDivisionId,
                updatedAt:
                  new Date()
                    .toISOString(),
                updatedBy: {
                  username:
                    String(
                      actor?.username ||
                      ""
                    ),
                  fullName:
                    String(
                      actor?.fullName ||
                      ""
                    )
                }
              }
            : role
      );

  await saveCustomRoles(
    custom
  );

  return custom.find(
    (role) =>
      role.id === id
  );
}

export async function deleteRole({
  roleId,
  actor
}) {
  const id =
    String(roleId || "")
      .trim()
      .toLowerCase();

  const roles =
    await getRoleDefinitions();

  const current =
    roles.find(
      (role) =>
        role.id === id
    );

  if (!current) {
    throw new Error(
      "Роль не найдена"
    );
  }

  if (current.builtin) {
    throw new Error(
      "Системные роли нельзя удалять"
    );
  }

  const remainingCustom =
    roles.filter(
      (role) =>
        !role.builtin &&
        role.id !== id
    );

  await saveCustomRoles(
    remainingCustom
  );

  /*
    Удалённая роль может остаться в старых назначениях.
    Сразу очищаем её у известных пользователей.
  */
  const users =
    getConfiguredUsers();

  const validRoleIds =
    new Set(
      roles
        .filter(
          (role) =>
            role.id !== id
        )
        .map(
          (role) =>
            role.id
        )
    );

  await Promise.all(
    users.map(
      async (user) => {
        try {
          const raw =
            await redisCommand(
              "GET",
              userRolesKey(
                user.username
              )
            );

          const assignment =
            safeParse(
              raw,
              null
            );

          if (
            !assignment ||
            !Array.isArray(
              assignment.roleIds
            )
          ) {
            return;
          }

          const next =
            assignment.roleIds
              .filter(
                (roleId) =>
                  roleId !== id &&
                  validRoleIds.has(
                    roleId
                  )
              );

          if (!next.length) {
            await redisCommand(
              "DEL",
              userRolesKey(
                user.username
              )
            );
            return;
          }

          await redisCommand(
            "SET",
            userRolesKey(
              user.username
            ),
            JSON.stringify({
              ...assignment,
              roleIds:
                next,
              updatedAt:
                new Date()
                  .toISOString(),
              updatedBy: {
                username:
                  String(
                    actor?.username ||
                    ""
                  ),
                fullName:
                  String(
                    actor?.fullName ||
                    ""
                  )
              }
            })
          );
        } catch (error) {
          console.error(
            "Не удалось очистить удалённую роль:",
            error
          );
        }
      }
    )
  );

  return true;
}

export async function assignUserRoles({
  username,
  roleIds,
  actor
}) {
  if (
    !isRuntimeStoreConfigured()
  ) {
    throw new Error(
      "Хранилище состояния не подключено"
    );
  }

  const target =
    getConfiguredUser(
      username
    );

  if (!target) {
    throw new Error(
      "Пользователь не найден"
    );
  }

  const roles =
    await getRoleDefinitions();

  const validIds =
    new Set(
      roles.map(
        (role) =>
          role.id
      )
    );

  const cleanRoleIds =
    [
      ...new Set(
        (Array.isArray(roleIds)
          ? roleIds
          : []
        )
          .map(
            (roleId) =>
              String(
                roleId || ""
              )
                .trim()
                .toLowerCase()
          )
          .filter(
            (roleId) =>
              validIds.has(
                roleId
              )
          )
      )
    ];

  if (!cleanRoleIds.length) {
    throw new Error(
      "Назначьте пользователю хотя бы одну роль"
    );
  }

  const current =
    await resolveUserAccess(
      target
    );

  const actorUsername =
    String(
      actor?.username || ""
    )
      .trim()
      .toLowerCase();

  const targetUsername =
    String(
      target.username
    )
      .trim()
      .toLowerCase();

  /*
    Не даём разработчику случайно снять свою собственную
    системную роль и потерять доступ к управлению ролями.
  */
  if (
    actorUsername ===
      targetUsername &&
    current?.isDeveloper &&
    !cleanRoleIds.includes(
      "developer"
    )
  ) {
    throw new Error(
      "Нельзя снять роль «Разработчик» у текущей учётной записи"
    );
  }

  await redisCommand(
    "SET",
    userRolesKey(
      target.username
    ),
    JSON.stringify({
      roleIds:
        cleanRoleIds,
      updatedAt:
        new Date()
          .toISOString(),
      updatedBy: {
        username:
          String(
            actor?.username || ""
          ),
        fullName:
          String(
            actor?.fullName || ""
          )
      }
    })
  );

  return resolveUserAccess(
    target
  );
}

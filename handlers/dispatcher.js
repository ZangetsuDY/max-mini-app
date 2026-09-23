import {
  getSession
} from "../lib/security.js";

import {
  resolveSessionAccess,
  hasPanel,
  DISPATCHER_RES_REGISTRY
} from "../lib/access-control.js";

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store"
      }
    }
  );
}

const DISPATCHER_DATA = Object.freeze({
  ves: {
    requests: {
      open: 2,
      approvedShift: 8,
      ending: 10,
      total: 20,
      closed: 2
    }
  },
  yues: {
    requests: {
      open: 1,
      approvedShift: 6,
      ending: 4,
      total: 11,
      closed: 1
    }
  },
  gtes: {
    requests: {
      open: 3,
      approvedShift: 7,
      ending: 5,
      total: 15,
      closed: 4
    }
  }
});

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json(
        { error: "Method not allowed" },
        405
      );
    }

    let session;

    try {
      session =
        getSession(request);
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Ошибка сессии"
        },
        500
      );
    }

    if (!session) {
      return json(
        { error: "Требуется авторизация" },
        401
      );
    }

    const access =
      await resolveSessionAccess(
        session
      );

    if (
      !access ||
      !hasPanel(
        access,
        "dispatcher"
      )
    ) {
      return json(
        {
          allowed: false,
          code: "NOT_DISPATCHER",
          message:
            "У вашей роли нет доступа к интерфейсу диспетчера"
        },
        403
      );
    }

    const url =
      new URL(request.url);

    const requestedDivisionId =
      String(
        url.searchParams.get(
          "division"
        ) || ""
      )
        .trim()
        .toLowerCase();

    const validDivisionIds =
      new Set(
        DISPATCHER_RES_REGISTRY.map(
          (division) =>
            division.id
        )
      );

    const selectedDivisionId =
      validDivisionIds.has(
        requestedDivisionId
      )
        ? requestedDivisionId
        : (
            access.dispatcherDivisionId ||
            DISPATCHER_RES_REGISTRY[0]?.id ||
            "ves"
          );

    const selectedDivision =
      DISPATCHER_RES_REGISTRY.find(
        (division) =>
          division.id ===
          selectedDivisionId
      ) ||
      DISPATCHER_RES_REGISTRY[0];

    const data =
      DISPATCHER_DATA[
        selectedDivisionId
      ] ||
      DISPATCHER_DATA.ves;

    return json({
      allowed: true,
      code: "READY",
      division:
        selectedDivision,
      assignedDivisionId:
        access.dispatcherDivisionId || "",
      assignedDivisionName:
        access.dispatcherDivisionName || "",
      availableDivisions:
        DISPATCHER_RES_REGISTRY,
      requests:
        data.requests,
      defects: {
        available: false,
        message: "В разработке"
      },
      updatedAt:
        new Date().toISOString()
    });
  }
};

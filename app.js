/* =========================================================
   ПАО «Россети Ленэнерго» — Mini App
   Авторизация -> Главное меню -> Модули
   ========================================================= */

const API_LOGIN = "/api/login";
const API_LOGOUT = "/api/logout";
const API_ME = "/api/me";
const API_OUTAGES = "/api/outages";
const API_DISPATCHER = "/api/dispatcher";
const API_EXECUTIVE_MONITORING = "/api/executive-monitoring";
const API_HEARTBEAT = "/api/heartbeat";
const API_SYSTEM = "/api/system";
const API_ADMIN_DASHBOARD = "/api/admin/dashboard";
const API_ADMIN_SYSTEM = "/api/admin/system";
const API_ADMIN_ACCESS = "/api/admin/access";
const API_ADMIN_ROLES = "/api/admin/roles";
const API_ADMIN_USER_ROLES = "/api/admin/user-roles";
const API_ADMIN_USERS = "/api/admin/users";
const API_ADMIN_DISPATCHER_CONFIG = "/api/admin/dispatcher-config";
const API_ADMIN_OUTAGE_CONFIG = "/api/admin/outage-config";
const API_EXCEL_EXPORTS = "/api/excel-exports";
const API_ADMIN_OUTAGES_EXPORT = "/api/admin/outages-export";
const API_REQUESTS_DETAILS = "/api/requests-details";
const API_WORKORDERS_DETAILS = "/api/workorders-details";
const API_WORKORDERS_HISTORY = "/api/workorders-history";
const API_ADMIN_EXCEL_EXPORT_CONFIG = "/api/admin/excel-export-config";

const REFRESH_INTERVAL_MS = 120_000;
const HEARTBEAT_INTERVAL_MS = 60_000;
const ADMIN_REFRESH_INTERVAL_MS = 60_000;
const DISPATCHER_REFRESH_INTERVAL_MS = 60_000;
const EXECUTIVE_REFRESH_INTERVAL_MS = 60_000;
const SESSION_STORAGE_KEY = "le_app_session";
const MAX_BRIDGE_URL = "https://st.max.ru/js/max-web-app.js";
const STARTUP_REQUEST_TIMEOUT_MS = 7_000;
const LOGIN_REQUEST_TIMEOUT_MS = 18_000;
const MAX_BRIDGE_TIMEOUT_MS = 10_000;


const authScreen = document.getElementById("authScreen");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");

const userFullName = document.getElementById("userFullName");
const userRoleBadge = document.getElementById("userRoleBadge");
const logoutButton = document.getElementById("logoutButton");
const brandHomeButton = document.getElementById("brandHomeButton");

const homeView = document.getElementById("homeView");
const monitoringView = document.getElementById("monitoringView");
const dispatcherView = document.getElementById("dispatcherView");
const executiveView = document.getElementById("executiveView");
const requestsView = document.getElementById("requestsView");
const workordersView = document.getElementById("workordersView");
const excelExportsView = document.getElementById("excelExportsView");
const adminView = document.getElementById("adminView");

const openMonitoringButton = document.getElementById("openMonitoringButton");
const openDispatcherButton = document.getElementById("openDispatcherButton");
const openExecutiveButton = document.getElementById("openExecutiveButton");
const openExcelExportsButton = document.getElementById("openExcelExportsButton");
const openAdminButton = document.getElementById("openAdminButton");
const monitoringCardStatus = document.getElementById("monitoringCardStatus");
const excelExportsCardStatus = document.getElementById("excelExportsCardStatus");
const adminCardStatus = document.getElementById("adminCardStatus");
const dispatcherCardStatus = document.getElementById("dispatcherCardStatus");
const executiveCardStatus = document.getElementById("executiveCardStatus");
const moduleCount = document.getElementById("moduleCount");
const backToMenuButton = document.getElementById("backToMenuButton");
const backFromDispatcherButton = document.getElementById("backFromDispatcherButton");
const backFromExecutiveButton = document.getElementById("backFromExecutiveButton");
const backFromExcelExportsButton = document.getElementById("backFromExcelExportsButton");
const backFromAdminButton = document.getElementById("backFromAdminButton");

const excelExportsUpdatedAt = document.getElementById("excelExportsUpdatedAt");
const excelEmergencyRowCount = document.getElementById("excelEmergencyRowCount");
const excelEmergencySourceState = document.getElementById("excelEmergencySourceState");
const excelPreviewLimit = document.getElementById("excelPreviewLimit");
const excelTogglePreviewButton = document.getElementById("excelTogglePreviewButton");
const excelRefreshPreviewButton = document.getElementById("excelRefreshPreviewButton");
const excelPreviewPanel = document.getElementById("excelPreviewPanel");
const excelDownloadEmergencyButton = document.getElementById("excelDownloadEmergencyButton");
const excelPreviewTitle = document.getElementById("excelPreviewTitle");
const excelPreviewMeta = document.getElementById("excelPreviewMeta");
const excelPreviewState = document.getElementById("excelPreviewState");
const excelPreviewSheet = document.getElementById("excelPreviewSheet");
const excelPreviewDocumentTitle = document.getElementById("excelPreviewDocumentTitle");
const excelPreviewDocumentSubtitle = document.getElementById("excelPreviewDocumentSubtitle");
const excelPreviewTable = document.getElementById("excelPreviewTable");

const excelExportManagementPanel = document.getElementById("excelExportManagementPanel");
const excelTemplateSaveButton = document.getElementById("excelTemplateSaveButton");
const excelTemplateStatus = document.getElementById("excelTemplateStatus");
const excelTemplateTitle = document.getElementById("excelTemplateTitle");
const excelTemplateSubtitle = document.getElementById("excelTemplateSubtitle");
const excelTemplateSheetName = document.getElementById("excelTemplateSheetName");
const excelTemplateFileName = document.getElementById("excelTemplateFileName");
const excelTemplateStartRow = document.getElementById("excelTemplateStartRow");
const excelTemplateGeneratedAt = document.getElementById("excelTemplateGeneratedAt");
const excelTemplateSourceAt = document.getElementById("excelTemplateSourceAt");
const excelTemplateFreeze = document.getElementById("excelTemplateFreeze");
const excelTemplateFilter = document.getElementById("excelTemplateFilter");
const excelTitleFontSize = document.getElementById("excelTitleFontSize");
const excelTitleRowHeight = document.getElementById("excelTitleRowHeight");
const excelTitleColor = document.getElementById("excelTitleColor");
const excelTitleFill = document.getElementById("excelTitleFill");
const excelHeaderFontSize = document.getElementById("excelHeaderFontSize");
const excelHeaderRowHeight = document.getElementById("excelHeaderRowHeight");
const excelHeaderColor = document.getElementById("excelHeaderColor");
const excelHeaderFill = document.getElementById("excelHeaderFill");
const excelBodyFontSize = document.getElementById("excelBodyFontSize");
const excelBodyRowHeight = document.getElementById("excelBodyRowHeight");
const excelBodyColor = document.getElementById("excelBodyColor");
const excelBodyFill = document.getElementById("excelBodyFill");
const excelBodyAltFill = document.getElementById("excelBodyAltFill");
const excelTemplateDivisionPicker = document.getElementById("excelTemplateDivisionPicker");
const excelTemplateColumns = document.getElementById("excelTemplateColumns");
const excelTemplateAddColumnButton = document.getElementById("excelTemplateAddColumnButton");

const systemLine = document.getElementById("systemLine");
const systemStatusText = document.getElementById("systemStatusText");

const adminUpdatedAt = document.getElementById("adminUpdatedAt");
const adminSystemBadge = document.getElementById("adminSystemBadge");
const storageWarning = document.getElementById("storageWarning");
const adminOnlineCount = document.getElementById("adminOnlineCount");
const adminTotalUsers = document.getElementById("adminTotalUsers");
const adminDispatcherCount = document.getElementById("adminDispatcherCount");
const adminDeveloperCount = document.getElementById("adminDeveloperCount");
const modeSelector = document.getElementById("modeSelector");
const systemMessageInput = document.getElementById("systemMessageInput");
const systemChangedInfo = document.getElementById("systemChangedInfo");
const saveSystemStateButton = document.getElementById("saveSystemStateButton");
const refreshAdminButton = document.getElementById("refreshAdminButton");
const createUserButton = document.getElementById("createUserButton");
const sessionList = document.getElementById("sessionList");

const accessManagementPanel =
  document.getElementById(
    "accessManagementPanel"
  );

const createRoleButton =
  document.getElementById(
    "createRoleButton"
  );

const roleList =
  document.getElementById(
    "roleList"
  );

const managementModal =
  document.getElementById(
    "managementModal"
  );

const closeManagementModal =
  document.getElementById(
    "closeManagementModal"
  );

const managementCancelButton =
  document.getElementById(
    "managementCancelButton"
  );

const managementSaveButton =
  document.getElementById(
    "managementSaveButton"
  );

const managementEyebrow =
  document.getElementById(
    "managementEyebrow"
  );

const managementTitle =
  document.getElementById(
    "managementTitle"
  );

const managementBody =
  document.getElementById(
    "managementBody"
  );

const activeOutagesSelector = document.getElementById("activeOutagesSelector");
const outageDetailsView = document.getElementById("outageDetailsView");
const monitoringBackLabel = document.getElementById("monitoringBackLabel");
const emergencyOutagesChoice = document.getElementById("emergencyOutagesChoice");
const plannedOutagesChoice = document.getElementById("plannedOutagesChoice");
const emergencyOutagesChoiceCount = document.getElementById("emergencyOutagesChoiceCount");
const plannedOutagesChoiceCount = document.getElementById("plannedOutagesChoiceCount");
const emergencyOutagesChoiceStatus = document.getElementById("emergencyOutagesChoiceStatus");
const plannedOutagesChoiceStatus = document.getElementById("plannedOutagesChoiceStatus");
const monitoringDetailEyebrow = document.getElementById("monitoringDetailEyebrow");
const monitoringDetailTitle = document.getElementById("monitoringDetailTitle");
const monitoringDetailCopy = document.getElementById("monitoringDetailCopy");
const totalOutagesLabel = document.getElementById("totalOutagesLabel");
const totalOutagesHint = document.getElementById("totalOutagesHint");
const monitoringHeadingLabel = document.getElementById("monitoringHeadingLabel");
const monitoringHeadingTitle = document.getElementById("monitoringHeadingTitle");
const divisionGrid = document.getElementById("divisionGrid");
const totalOutages = document.getElementById("totalOutages");
const updatedAt = document.getElementById("updatedAt");
const dashboardStatus = document.getElementById("dashboardStatus");
const divisionCountCaption = document.getElementById("divisionCountCaption");

const dispatcherAssignedDivision = document.getElementById("dispatcherAssignedDivision");
const dispatcherAssignedHint = document.getElementById("dispatcherAssignedHint");
const dispatcherGroupSelectWrap = document.getElementById("dispatcherGroupSelectWrap");
const dispatcherGroupSelect = document.getElementById("dispatcherGroupSelect");
const dispatcherUnitSelect = document.getElementById("dispatcherUnitSelect");
const dispatcherRefreshButton = document.getElementById("dispatcherRefreshButton");
const dispatcherUpdatedAt = document.getElementById("dispatcherUpdatedAt");
const dispatcherDataNotice = document.getElementById("dispatcherDataNotice");
const dispatcherUnitTitle = document.getElementById("dispatcherUnitTitle");
const dispatcherSourceMeta = document.getElementById("dispatcherSourceMeta");
const dispatcherSourcesText = document.getElementById("dispatcherSourcesText");
const dispatcherSourceBreakdown = document.getElementById("dispatcherSourceBreakdown");
const dispatcherLiveBadge = document.getElementById("dispatcherLiveBadge");
const dispatcherRequestsChart = document.getElementById("dispatcherRequestsChart");
const dispatcherReqReview = document.getElementById("dispatcherReqReview");
const dispatcherReqApproved = document.getElementById("dispatcherReqApproved");
const dispatcherReqOpen = document.getElementById("dispatcherReqOpen");
const dispatcherReqClosed = document.getElementById("dispatcherReqClosed");
const dispatcherReqAcknowledged = document.getElementById("dispatcherReqAcknowledged");
const dispatcherReqEnding = document.getElementById("dispatcherReqEnding");
const dispatcherReqTotal = document.getElementById("dispatcherReqTotal");
const dispatcherReqTotalCaption = document.getElementById("dispatcherReqTotalCaption");

const dispatcherWorkordersLiveBadge = document.getElementById("dispatcherWorkordersLiveBadge");
const dispatcherWorkordersMeta = document.getElementById("dispatcherWorkordersMeta");
const dispatcherWorkordersSourcesText = document.getElementById("dispatcherWorkordersSourcesText");
const dispatcherWorkordersNotice = document.getElementById("dispatcherWorkordersNotice");
const dispatcherWorkordersBreakdown = document.getElementById("dispatcherWorkordersBreakdown");
const dispatcherWorkordersChart = document.getElementById("dispatcherWorkordersChart");
const dispatcherWorkordersTotal = document.getElementById("dispatcherWorkordersTotal");
const dispatcherWorkordersRegistered = document.getElementById("dispatcherWorkordersRegistered");
const dispatcherWorkordersCreated = document.getElementById("dispatcherWorkordersCreated");
const dispatcherWorkordersAdmission = document.getElementById("dispatcherWorkordersAdmission");
const dispatcherWorkordersPreparation = document.getElementById("dispatcherWorkordersPreparation");
const dispatcherWorkordersBreak = document.getElementById("dispatcherWorkordersBreak");

const dispatcherOutagesLiveBadge = document.getElementById("dispatcherOutagesLiveBadge");
const dispatcherOutagesMeta = document.getElementById("dispatcherOutagesMeta");
const dispatcherOutagesSourcesText = document.getElementById("dispatcherOutagesSourcesText");
const dispatcherOutagesNotice = document.getElementById("dispatcherOutagesNotice");
const dispatcherEmergencyOutagesCount = document.getElementById("dispatcherEmergencyOutagesCount");
const dispatcherEmergencyAppealsCount = document.getElementById("dispatcherEmergencyAppealsCount");
const dispatcherPlannedOutagesCount = document.getElementById("dispatcherPlannedOutagesCount");
const dispatcherPlannedAppealsCount = document.getElementById("dispatcherPlannedAppealsCount");
const dispatcherEmergencyOutagesTableBody = document.getElementById("dispatcherEmergencyOutagesTableBody");
const dispatcherPlannedOutagesTableBody = document.getElementById("dispatcherPlannedOutagesTableBody");
const dispatcherEmergencyOutagesDetails = document.getElementById("dispatcherEmergencyOutagesDetails");
const dispatcherPlannedOutagesDetails = document.getElementById("dispatcherPlannedOutagesDetails");
const dispatcherHierarchyPanel = document.getElementById("dispatcherHierarchyPanel");
const dispatcherHierarchyScope = document.getElementById("dispatcherHierarchyScope");
const dispatcherHierarchyCount = document.getElementById("dispatcherHierarchyCount");
const dispatcherHierarchyMainRole = document.getElementById("dispatcherHierarchyMainRole");
const dispatcherHierarchyMainPerson = document.getElementById("dispatcherHierarchyMainPerson");
const dispatcherHierarchySourceMeta = document.getElementById("dispatcherHierarchySourceMeta");
const dispatcherHierarchySubordinateList = document.getElementById("dispatcherHierarchySubordinateList");

const outageManagementPanel = document.getElementById("outageManagementPanel");
const outageCreateDivisionButton = document.getElementById("outageCreateDivisionButton");
const outageConfigStatus = document.getElementById("outageConfigStatus");
const outageConfigList = document.getElementById("outageConfigList");

const dispatcherSourceManagementPanel = document.getElementById("dispatcherSourceManagementPanel");
const dispatcherConfigGroupSelect = document.getElementById("dispatcherConfigGroupSelect");
const dispatcherCreateGroupButton = document.getElementById("dispatcherCreateGroupButton");
const dispatcherCreateUnitButton = document.getElementById("dispatcherCreateUnitButton");
const dispatcherEditGroupButton = document.getElementById("dispatcherEditGroupButton");
const dispatcherDeleteGroupButton = document.getElementById("dispatcherDeleteGroupButton");
const dispatcherConfigStatus = document.getElementById("dispatcherConfigStatus");
const dispatcherConfigList = document.getElementById("dispatcherConfigList");
const dispatcherHierarchyManagementPanel = document.getElementById("dispatcherHierarchyManagementPanel");
const dispatcherHierarchyConfigGroupSelect = document.getElementById("dispatcherHierarchyConfigGroupSelect");
const dispatcherHierarchyConfigStatus = document.getElementById("dispatcherHierarchyConfigStatus");
const dispatcherHierarchyConfigList = document.getElementById("dispatcherHierarchyConfigList");
const dispatcherPersonnelChatIdInput = document.getElementById("dispatcherPersonnelChatIdInput");
const dispatcherPersonnelChatSaveButton = document.getElementById("dispatcherPersonnelChatSaveButton");
const dispatcherPersonnelSourceStatus = document.getElementById("dispatcherPersonnelSourceStatus");

const executiveTableManagementPanel = document.getElementById("executiveTableManagementPanel");
const executiveTableCreateButton = document.getElementById("executiveTableCreateButton");
const executiveTableConfigStatus = document.getElementById("executiveTableConfigStatus");
const executiveTableConfigList = document.getElementById("executiveTableConfigList");

const executiveRegionalMap = document.getElementById("executiveRegionalMap");
const executiveRegionalMapMeta = document.getElementById("executiveRegionalMapMeta");
const executiveMapManagementPanel = document.getElementById("executiveMapManagementPanel");
const executiveMapConfigStatus = document.getElementById("executiveMapConfigStatus");
const executiveMapConfigList = document.getElementById("executiveMapConfigList");

const dispatcherWorkordersManagementPanel = document.getElementById("dispatcherWorkordersManagementPanel");
const dispatcherWorkordersConfigGroupSelect = document.getElementById("dispatcherWorkordersConfigGroupSelect");
const dispatcherWorkordersConfigStatus = document.getElementById("dispatcherWorkordersConfigStatus");
const dispatcherWorkordersConfigList = document.getElementById("dispatcherWorkordersConfigList");

const accessModal = document.getElementById("accessModal");
const closeModalButton = document.getElementById("closeModalButton");
const modalActionButton = document.getElementById("modalActionButton");
const viewLoadingOverlay = document.getElementById("viewLoadingOverlay");
const viewLoadingText = document.getElementById("viewLoadingText");
const exitConfirmModal = document.getElementById("exitConfirmModal");
const exitConfirmCloseButton = document.getElementById("exitConfirmCloseButton");
const exitConfirmYesButton = document.getElementById("exitConfirmYesButton");
let viewLoadingToken = 0;
const REQUESTS_PAGE_SIZE = 60;
const REQUESTS_REFRESH_INTERVAL_MS = 60000;
const REQUEST_STATUS_FILTERS = [
  { key: "all", label: "Все" },
  { key: "review", label: "В рассмотрении" },
  { key: "approved", label: "Разрешена" },
  { key: "open", label: "Открыта" },
  { key: "closed", label: "Закрыта" },
  { key: "acknowledged", label: "Принята к сведению" },
  { key: "ending", label: "Заканчиваются в смену" }
];

const WO_PAGE_SIZE = 48;
const workordersState = {
  scope: "dispatcher",
  groupId: "",
  unitId: "",
  returnView: "home",
  data: null,
  tab: "dashboard",
  funnelMode: "branch",
  snapshotId: "",
  snapshots: [],
  filter: "all",
  query: "",
  shown: WO_PAGE_SIZE,
  refreshTimer: null,
  loadToken: 0
};

const requestsState = {
  scope: "dispatcher",
  groupId: "",
  unitId: "",
  returnView: "home",
  data: null,
  filter: "all",
  query: "",
  shown: REQUESTS_PAGE_SIZE,
  refreshTimer: null,
  loadToken: 0
};

const modalIcon = document.getElementById("modalIcon");
const modalEyebrow = document.getElementById("modalEyebrow");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");

let currentUser = null;
let currentView = "home";
let currentSystemState = {
  mode: "normal",
  message: "",
  storageConfigured: false
};

let refreshTimer = null;
let heartbeatTimer = null;
let adminRefreshTimer = null;
let dispatcherRefreshTimer = null;
let executiveRefreshTimer = null;
let loadVersion = 0;
let selectedSystemMode = "normal";
let selectedDispatcherGroupId = "";
let selectedDispatcherUnitId = "";
let selectedExecutiveGroupId = "";
let selectedExecutiveUnitId = "";
let dispatcherBreakdownUnitId = "";
let dispatcherBreakdownSelection = "__all__";
let dispatcherBreakdownExpanded = false;
let dispatcherWorkordersBreakdownUnitId = "";
let dispatcherWorkordersBreakdownSelection = "__all__";
let dispatcherWorkordersBreakdownExpanded = true;
let selectedOutageKind = "";
let expandedOutageDivisionIds = new Set();
let outageDivisionsState = [];
let outageSourceUpdatedAt = "";
const outageDetailLoadingIds = new Set();
const apiJsonCache = new Map();

let accessCatalog = {
  panels: [],
  roles: [],
  users: [],
  dispatcherDivisions: []
};

let outageConfigCatalog = {
  divisions: [],
  availableSourceLabels: [],
  unassignedSources: { emergency: [], planned: [] },
  sourceData: {},
  storageConfigured: false
};

let dispatcherConfigCatalog = {
  groups: [],
  units: [],
  availableSourceLabels: [],
  outageDivisions: [],
  outageSourceData: { emergency: {}, planned: {} },
  sourceData: {},
  storageConfigured: false
};

let dispatcherHierarchyConfigCatalog = {
  groups: [],
  units: [],
  roleCatalog: [],
  personnel: {},
  storageConfigured: false
};

let dispatcherWorkordersConfigCatalog = {
  groups: [],
  units: [],
  availableSourceLabels: [],
  sourceData: {},
  storageConfigured: false
};

let executiveTableConfigCatalog = {
  rows: [],
  groups: [],
  outageDivisions: [],
  storageConfigured: false
};


let executiveMapConfigCatalog = {
  zones: [],
  groups: [],
  units: [],
  outageDivisions: [],
  storageConfigured: false
};

let excelTemplateCatalog = {
  config: null,
  divisions: [],
  fieldOptions: [],
  storageConfigured: false
};

let excelPreviewPayload = null;
let excelPreviewOpen = false;
let excelTemplateDirty = false;

const EXECUTIVE_MAP_VIEWBOX = Object.freeze({ width: 970, height: 713 });

/*
  Контуры: внешняя граница Ленобласти, СПб и береговая линия — по данным
  @amcharts/amcharts5-geodata (russiaHigh, см. third_party/amcharts-geodata),
  Ладожское озеро — Natural Earth (public domain); границы районов упрощены для
  оперативного интерфейса, но образуют единое разбиение области — районы
  стыкуются без наложений и щелей. Генератор: scripts/build-executive-map.py.
*/
const EXECUTIVE_MAP_BACKDROP = Object.freeze({
  neighbors: "M-58.4,463.0L-20.2,459.9L29.9,472.0L45.0,469.2L57.5,454.0L75.7,471.7L76.9,479.3L67.7,496.2L47.9,500.5L42.0,507.1L39.5,521.0L29.8,534.9L22.6,565.3L-27.4,564.0L-58.4,578.3ZM-58.4,617.1L-44.8,634.9L-38.9,655.4L-35.3,674.6L-35.3,699.2L-32.2,705.0L-22.0,703.1L-11.8,711.6L-16.1,712.7L-13.0,723.8L-15.4,727.8L-8.7,738.3L-7.8,752.4L-1.7,772.2L6.7,777.2L4.8,788.4L8.3,795.2L7.9,803.7L12.3,797.0L11.6,792.7L16.5,795.8L10.5,790.0L15.2,778.3L2.3,766.7L-7.0,745.7L-8.2,729.4L1.2,708.4L-10.5,612.9L-5.8,596.6L22.2,566.3L19.9,570.9L21.0,577.9L25.7,580.2L42.1,563.9L58.4,566.3L74.8,573.3L85.3,598.9L90.0,601.2L100.5,598.9L170.6,615.2L180.0,629.2L201.0,645.5L201.0,661.8L203.3,666.5L234.9,675.8L241.9,694.4L265.3,701.4L278.1,694.4L291.0,699.1L305.0,689.8L305.0,668.8L299.2,661.8L299.2,652.5L306.2,640.8L301.5,636.2L305.0,626.9L319.0,629.2L330.7,638.5L340.1,636.2L347.1,626.9L371.6,629.2L375.1,622.2L376.3,603.5L398.5,584.9L404.4,559.3L409.0,554.6L421.9,554.6L435.9,566.3L451.1,559.3L455.8,552.3L457.0,543.0L465.1,536.0L467.5,526.6L465.1,524.3L473.3,517.3L469.8,512.7L467.5,484.7L483.8,487.0L494.3,501.0L501.4,501.0L507.2,498.7L510.7,480.0L518.9,473.1L557.5,501.0L559.8,522.0L569.1,533.6L577.3,533.6L598.4,550.0L613.6,540.6L615.9,531.3L611.2,510.3L614.7,503.3L633.4,487.0L645.1,468.4L652.1,480.0L676.7,498.7L688.3,484.7L703.5,487.0L717.6,482.4L735.1,510.3L740.9,526.6L751.5,526.6L763.1,538.3L771.3,540.6L777.2,529.0L795.9,526.6L833.3,545.3L847.3,543.0L843.8,536.0L848.5,533.6L848.5,524.3L864.8,501.0L875.3,512.7L880.0,503.3L890.5,505.7L902.2,494.0L915.1,494.0L919.7,482.4L918.6,475.4L929.1,461.4L919.7,449.7L936.1,431.1L934.9,407.8L949.0,417.1L946.6,396.2L924.4,391.5L920.9,384.5L922.1,344.9L930.3,333.2L890.5,319.3L890.5,314.6L897.5,312.3L897.5,302.9L887.0,293.6L890.5,282.0L889.4,268.0L898.7,256.3L910.4,198.1L905.7,170.1L894.0,144.5L908.1,128.2L915.1,125.8L927.9,132.8L936.1,123.5L940.8,111.9L931.4,104.9L931.4,97.9L947.8,83.9L953.6,67.6L953.6,58.3L940.8,41.9L927.9,58.3L923.3,58.3L911.6,48.9L911.6,37.3L915.1,28.0L911.6,25.6L903.4,32.6L896.4,30.3L883.5,37.3L847.3,16.3L813.4,39.6L808.7,60.6L778.3,35.0L769.0,39.6L726.9,32.6L691.9,51.3L695.4,60.6L707.0,72.2L712.9,74.6L726.9,67.6L742.1,74.6L729.3,104.9L724.6,109.5L695.4,93.2L688.3,95.5L690.7,102.5L659.1,128.2L652.1,149.1L641.6,156.1L632.3,153.8L625.2,158.5L623.0,167.6L614.5,154.7L614.5,137.9L609.3,125.4L594.5,100.2L589.3,98.1L581.9,70.8L508.3,22.6L485.1,1.6L477.8,-11.0L473.6,-0.5L459.9,-29.9L446.2,-48.7L438.9,-42.4L431.5,-52.9L414.7,-46.6L406.2,-67.6L386.3,-82.3L374.7,-73.9L355.8,-42.4L358.9,-32.0L356.8,-27.8L350.5,-27.8L341.0,-15.2L314.7,-21.5L315.8,-8.9L307.4,10.0L308.4,22.6L296.8,28.9L295.8,41.5L273.7,28.9L269.5,35.2L270.5,39.4L266.3,47.7L269.5,54.0L284.8,65.2L264.1,53.6L238.4,51.3L234.9,39.6L219.7,35.0L206.9,18.6L229.1,-9.3L228.2,-14.6L228.6,-9.7L207.6,16.7L198.3,34.7L164.7,62.3L148.7,69.7L136.5,87.3L129.2,109.6L114.0,107.9L38.0,190.0L34.6,200.2L27.7,203.7L26.2,195.9L20.3,196.0L22.9,215.8L4.9,216.2L8.7,221.8L-6.2,211.8L-10.1,214.9L-6.0,222.3L-8.2,223.3L-20.4,213.1L-19.7,217.3L-24.1,216.8L-21.5,213.5L-28.1,209.2L-40.6,210.8L-41.1,202.0L-30.9,206.6L-40.9,199.5L-44.0,199.9L-44.3,209.9L-51.2,205.0L-58.4,208.7L-58.4,-116.5L316.4,-116.5L312.4,-111.3L317.1,-116.5L1028.4,-116.5L1028.4,829.6L32.7,829.6L32.7,822.6L29.2,815.6L17.5,813.3L15.2,808.6L17.5,801.6L17.2,799.6L12.8,807.6L15.8,814.5L19.7,815.4L17.3,818.8L31.1,821.0L30.9,829.3L-58.4,829.6ZM16.9,797.7L16.6,796.0L16.2,797.2ZM228.0,-16.8L228.0,-16.3L231.8,-16.9ZM260.6,-45.7L250.1,-30.6L239.5,-18.1L257.1,-35.0ZM268.8,-58.3L268.7,-58.4L267.5,-56.9ZM278.1,-67.6L271.5,-61.2L271.4,-60.8ZM292.7,-84.6L291.6,-81.1L292.2,-81.6ZM294.8,-91.4L303.9,-100.2L309.7,-107.8L295.3,-93.0ZM309.6,-109.9L309.7,-109.5L310.5,-110.0Z",
  ladoga: "M615.6,217.6L611.4,217.6L604.0,209.2L594.5,205.1L590.3,207.2L589.3,211.3L597.7,232.3L598.7,238.6L596.6,244.9L589.3,249.1L589.3,253.3L591.4,263.8L591.4,274.3L588.2,282.7L578.8,289.0L561.9,297.3L550.4,295.2L543.0,284.8L527.2,278.5L502.0,272.2L485.1,276.4L473.6,291.1L472.5,295.2L472.5,297.3L473.6,297.3L473.6,299.4L467.3,314.1L466.2,322.5L469.4,330.9L469.4,339.3L467.3,345.6L463.0,349.8L456.7,351.9L450.4,351.9L444.1,345.6L415.7,347.7L408.3,341.4L419.9,328.8L419.9,322.5L415.7,318.3L414.7,312.0L416.8,299.4L405.2,286.9L397.8,270.1L385.2,228.1L383.1,223.9L379.9,226.0L376.8,226.0L376.8,215.5L370.5,200.9L364.2,192.5L348.4,184.1L345.2,167.3L345.2,161.0L347.3,158.9L348.4,152.6L348.4,142.1L345.2,133.7L337.9,127.4L336.8,121.2L333.7,114.9L321.0,96.0L301.1,77.1L269.5,54.0L266.3,47.7L270.5,39.4L269.5,35.2L273.7,28.9L280.0,31.0L289.5,39.4L295.8,41.5L296.8,37.3L296.8,28.9L301.1,24.7L306.3,24.7L308.4,22.6L309.5,16.3L307.4,14.2L307.4,10.0L309.5,7.9L310.5,-0.5L313.7,-6.8L315.8,-8.9L315.8,-13.1L313.7,-17.3L314.7,-21.5L320.0,-21.5L341.0,-15.2L343.1,-21.5L350.5,-27.8L356.8,-27.8L358.9,-32.0L355.8,-36.2L355.8,-42.4L374.7,-73.9L386.3,-82.3L390.5,-80.2L392.6,-76.0L406.2,-67.6L409.4,-63.4L411.5,-52.9L414.7,-46.6L422.0,-46.6L423.1,-48.7L431.5,-52.9L438.9,-42.4L442.0,-46.6L442.0,-48.7L446.2,-48.7L459.9,-29.9L470.4,-4.7L473.6,-0.5L475.7,-2.6L475.7,-8.9L477.8,-11.0L485.1,1.6L505.1,16.3L508.3,22.6L561.9,56.1L581.9,70.8L586.1,79.2L588.2,87.6L588.2,93.9L589.3,98.1L594.5,100.2L594.5,104.4L609.3,125.4L614.5,137.9L614.5,154.7L618.7,165.2L626.1,169.4L629.2,175.7L630.3,182.0L618.7,215.5Z"
});

const EXECUTIVE_MAP_GEOMETRY = Object.freeze([
  { id: "vyborg", x: 192, y: 182, d: "M213.0,57.2L234.0,103.2L232.4,116.7L248.1,150.8L243.7,173.0L269.0,216.6L270.0,230.3L276.3,237.0L279.9,247.4L279.9,270.0L275.8,282.6L265.3,275.0L237.2,268.0L223.2,279.6L217.4,293.6L181.1,291.3L171.8,289.0L168.3,282.0L169.5,277.3L163.6,272.6L164.8,270.3L151.9,263.3L147.3,247.0L142.6,256.3L125.0,249.3L119.2,230.7L111.0,219.0L105.2,202.7L111.0,202.7L111.0,209.7L127.4,228.4L136.7,228.4L132.1,214.4L125.0,207.4L129.7,207.4L130.9,200.4L127.4,193.4L133.2,193.4L128.6,184.1L128.6,174.8L135.6,177.1L139.1,167.8L132.1,160.8L134.4,156.1L128.6,165.5L128.6,172.4L119.2,179.4L116.9,174.8L112.2,174.8L95.8,181.8L98.2,188.8L87.7,186.4L91.2,193.4L85.3,191.1L86.5,195.7L80.6,195.7L78.3,200.4L78.3,209.7L71.3,205.1L65.4,209.7L53.8,209.7L50.3,214.4L47.9,209.7L37.4,212.1L33.9,202.7L38.6,191.1L107.5,114.2L115.7,107.2L129.7,109.5L135.6,90.9L150.8,67.6L163.6,62.9L167.1,55.9L198.7,35.0L206.9,18.6L212.4,27.5ZM132.1,153.8L141.4,160.8L134.4,151.5ZM28.0,209.7L31.6,205.1L29.2,202.7L33.9,202.7L32.7,207.4L35.1,216.7L26.9,216.7L31.6,214.4ZM119.2,198.1L116.9,191.1L119.2,188.8L118.0,184.1L114.5,186.4L112.2,181.8L114.5,177.1L127.4,193.4L126.2,198.1ZM127.4,270.3L115.7,258.7L116.9,251.7L120.4,249.3L135.6,263.3ZM132.1,223.7L118.0,212.1L120.4,207.4L126.2,216.7L133.2,219.0ZM111.0,258.7L102.8,244.7L108.7,244.7L114.5,254.0Z" },
  { id: "priozersk", x: 292, y: 154, d: "M276.3,237.0L270.0,230.3L269.0,216.6L243.7,173.0L248.1,150.8L232.4,116.7L234.0,103.2L213.0,57.2L212.4,27.5L219.7,35.0L234.9,39.6L238.4,51.3L274.6,58.3L279.3,65.2L284.8,65.2L301.1,77.1L321.0,96.0L348.4,142.1L347.3,158.9L345.2,161.0L348.4,184.1L363.3,192.0L347.5,199.9L340.5,216.2Z" },
  { id: "vsevolozhsk", x: 366, y: 284, d: "M347.7,366.2L344.8,361.2L344.8,351.9L348.3,335.6L327.2,319.3L329.6,305.3L331.9,302.9L330.7,300.6L314.4,298.3L275.8,282.6L279.9,270.0L279.9,247.4L276.3,237.0L340.5,216.2L347.5,199.9L363.3,192.0L374.7,209.2L376.8,226.0L383.1,223.9L385.2,228.1L405.2,286.9L416.8,299.4L414.7,312.0L419.9,323.5L396.8,327.4L396.8,373.5L353.6,363.7Z" },
  { id: "spb", x: 327, y: 383, d: "M232.6,270.3L244.3,268.0L258.3,275.0L265.3,275.0L273.5,282.0L281.7,284.3L287.5,289.0L314.4,298.3L330.7,300.6L331.9,302.9L329.6,305.3L327.2,314.6L327.2,319.3L330.7,323.9L344.8,330.9L348.3,335.6L344.8,351.9L344.8,361.2L347.1,365.9L375.1,382.2L376.3,391.5L374.0,396.2L365.8,403.1L356.4,400.8L349.4,405.5L345.9,417.1L342.4,419.5L328.4,424.1L314.4,421.8L312.0,417.1L289.8,400.8L287.5,393.8L268.8,375.2L268.8,370.5L260.6,372.8L248.9,363.5L250.1,347.2L260.6,347.2L261.8,349.5L274.6,356.5L281.7,356.5L289.8,363.5L295.7,363.5L299.2,361.2L302.7,363.5L306.2,356.5L303.9,355.8L307.4,356.5L314.4,349.5L309.7,344.9L310.9,340.2L309.7,335.6L307.4,333.2L298.0,333.2L281.7,328.6L281.7,316.9L277.0,309.9L280.5,305.3L278.1,295.9L239.6,284.3L229.1,289.0L224.4,289.0L220.9,293.6L217.4,293.6L218.5,286.6ZM295.8,353.2L261.8,340.2L257.1,335.6L253.6,335.6L250.1,333.2L251.3,330.9L248.9,326.2L250.1,323.9L257.1,326.2L257.1,328.6L264.1,333.2L261.8,335.6L261.8,337.9Z" },
  { id: "lomonosov", x: 228, y: 387, d: "M188.7,405.9L180.0,373.8L194.1,369.2L198.2,362.7L198.8,355.2L192.1,344.5L176.5,340.2L192.8,333.2L236.1,340.2L250.1,347.2L248.9,363.5L260.6,372.8L268.8,370.5L268.8,375.2L285.4,391.4L269.5,421.7L258.9,417.6L226.2,435.2L220.4,434.3L208.0,414.6Z" },
  { id: "sosnovy-bor", x: 186, y: 357, labelX: 118, labelY: 318, d: "M177.2,342.2L184.9,341.6L194.1,346.2L198.2,352.7L198.8,360.3L194.1,369.2L187.5,373.2L179.7,373.8L171.3,369.9L177.6,361.2L177.6,356.5L175.3,354.2L169.5,354.2L168.3,351.9L176.5,347.2Z" },
  { id: "kingisepp", x: 128, y: 446, d: "M186.9,464.9L145.4,509.2L99.9,509.2L93.6,513.8L47.4,500.8L57.3,494.0L66.6,494.0L67.8,484.7L77.1,480.0L74.8,470.7L57.3,452.1L61.9,442.8L63.1,421.8L59.6,419.5L52.6,403.1L57.3,393.8L54.9,391.5L64.3,379.8L72.5,379.8L78.3,398.5L77.1,403.1L99.3,410.1L104.0,403.1L104.0,377.5L107.5,370.5L115.7,365.9L130.9,375.2L136.7,384.5L143.7,379.8L150.8,382.2L173.0,368.2L171.3,369.9L180.0,373.8L188.7,405.9L168.3,418.7L165.1,443.0ZM-69.6,314.5L-61.9,319.3L-60.8,326.2L-65.4,328.6ZM33.9,321.6L37.4,328.6L42.1,328.6L32.7,335.6L28.0,333.2L30.4,323.9Z" },
  { id: "slantsy", x: 109, y: 555, d: "M93.6,513.8L99.9,509.2L145.4,509.2L168.0,537.5L157.0,559.7L129.7,576.1L118.9,605.8L100.5,598.9L85.3,598.9L74.8,573.3L67.8,568.6L42.1,563.9L33.9,568.6L25.7,580.2L21.0,577.9L19.9,570.9L30.4,533.6L36.2,526.6L40.9,508.0L46.7,501.0Z" },
  { id: "volosovo", x: 212, y: 484, d: "M262.7,536.3L251.0,550.3L239.3,555.9L200.1,532.9L168.0,537.5L145.4,509.2L186.9,464.9L165.1,443.0L168.3,418.7L188.7,405.9L208.0,414.6L220.4,434.3L226.2,435.2L258.9,417.6L271.3,423.7L277.5,448.2L245.4,461.7L240.4,481.6L268.2,504.8Z" },
  { id: "gatchina", x: 304, y: 478, d: "M245.4,461.7L277.5,448.2L269.5,421.7L285.4,391.4L289.8,400.8L314.4,421.8L328.4,424.1L342.4,419.5L352.6,403.4L361.5,425.8L357.2,439.1L345.0,446.3L342.8,483.0L367.8,499.7L360.9,530.8L328.9,540.5L262.7,536.3L268.2,504.8L240.4,481.6Z" },
  { id: "luga", x: 263, y: 623, d: "M129.7,576.1L157.0,559.7L168.0,537.5L200.1,532.9L239.3,555.9L251.0,550.3L262.7,536.3L328.9,540.5L360.9,530.8L403.7,563.0L398.5,584.9L376.3,603.5L375.1,622.2L371.6,629.2L364.6,631.5L358.8,626.9L347.1,626.9L340.1,636.2L330.7,638.5L319.0,629.2L308.5,624.5L305.0,626.9L301.5,636.2L306.2,640.8L299.2,652.5L299.2,661.8L305.0,668.8L305.0,689.8L291.0,699.1L278.1,694.4L265.3,701.4L241.9,694.4L237.2,687.4L234.9,675.8L209.2,671.1L203.3,666.5L201.0,661.8L201.0,645.5L180.0,629.2L170.6,615.2L118.9,605.8Z" },
  { id: "tosno", x: 427, y: 480, d: "M367.8,499.7L342.8,483.0L345.0,446.3L357.2,439.1L361.5,425.8L352.6,403.4L365.8,403.1L376.3,390.1L396.4,398.8L401.8,414.1L442.0,396.6L457.7,428.0L492.0,434.9L492.0,451.4L467.5,484.7L464.5,492.7L464.5,536.5L457.0,543.0L455.8,552.3L451.1,559.3L435.9,566.3L414.9,552.3L409.0,554.6L403.7,563.0L360.9,530.8Z" },
  { id: "kirovsk", x: 492, y: 369, d: "M492.0,434.9L457.7,428.0L442.0,396.6L401.8,414.1L396.4,398.8L376.3,390.1L375.1,382.2L347.7,366.2L353.6,363.7L396.8,373.5L396.8,327.4L419.9,323.5L419.9,328.8L408.3,341.4L415.7,347.7L444.1,345.6L450.4,351.9L463.0,349.8L469.4,339.3L469.4,330.9L466.2,322.5L473.6,299.4L473.6,291.1L485.4,276.3L531.2,371.9L531.2,387.3L519.2,393.0L500.2,428.0Z" },
  { id: "volkhov", x: 579, y: 365, d: "M531.2,371.9L485.4,276.3L502.0,272.2L527.2,278.5L543.0,284.8L550.4,295.2L561.9,297.3L578.8,289.0L588.2,282.7L591.4,274.3L589.3,249.1L596.6,244.9L598.7,238.6L589.8,209.1L631.7,227.1L662.0,221.0L697.4,259.1L692.4,281.9L660.3,288.6L660.3,344.9L639.8,357.2L628.7,390.5L629.7,408.9L618.9,413.0L574.8,449.9L530.0,388.6Z" },
  { id: "kirishi", x: 589, y: 491, d: "M464.5,492.7L467.5,488.3L469.8,512.7L473.3,517.3L465.1,524.3L467.5,526.6L464.5,536.5ZM492.0,451.4L492.0,434.9L500.2,428.0L519.2,393.0L530.0,388.6L574.8,449.9L618.9,413.0L629.7,408.9L649.8,423.4L674.4,471.3L673.6,484.9L669.1,494.0L647.4,475.4L645.1,468.4L633.4,487.0L614.7,503.3L611.2,510.3L611.2,517.3L615.9,531.3L613.6,540.6L604.2,550.0L598.4,550.0L577.3,533.6L569.1,533.6L559.8,522.0L557.5,501.0L518.9,473.1L510.7,480.0L507.2,498.7L501.4,501.0L494.3,501.0L483.8,487.0L469.9,484.7Z" },
  { id: "lodeynoye", x: 718, y: 189, d: "M697.4,259.1L662.0,221.0L631.7,227.1L589.8,209.1L594.5,205.1L611.4,217.6L618.7,215.5L630.3,182.0L626.1,169.4L623.0,167.6L626.4,160.8L625.2,158.5L632.3,153.8L641.6,156.1L652.1,149.1L655.6,144.5L659.1,128.2L675.5,111.9L688.3,104.9L690.7,102.5L688.3,95.5L695.4,93.2L739.5,117.3L766.4,174.9L782.8,183.6L803.4,235.4L746.0,249.8L724.3,304.3L692.4,281.9Z" },
  { id: "podporozhye", x: 840, y: 148, d: "M889.1,286.8L855.8,264.7L814.6,246.8L803.4,235.4L782.8,183.6L766.4,174.9L739.5,117.3L725.3,108.8L732.8,97.9L742.1,74.6L726.9,67.6L712.9,74.6L707.0,72.2L695.4,60.6L691.9,51.3L726.9,32.6L769.0,39.6L778.3,35.0L808.7,60.6L813.4,39.6L835.6,25.6L842.6,16.3L847.3,16.3L873.0,28.0L883.5,37.3L889.4,37.3L896.4,30.3L903.4,32.6L911.6,25.6L915.1,28.0L911.6,37.3L911.6,48.9L923.3,58.3L927.9,58.3L940.8,41.9L953.6,58.3L953.6,67.6L947.8,83.9L931.4,97.9L931.4,104.9L940.8,111.9L936.1,118.8L936.1,123.5L927.9,132.8L915.1,125.8L908.1,128.2L894.0,144.5L905.7,170.1L910.4,188.8L910.4,198.1L898.7,256.3L889.4,268.0Z" },
  { id: "tikhvin", x: 698, y: 370, d: "M628.7,390.5L639.8,357.2L660.3,344.9L661.6,287.0L692.4,281.9L724.3,304.3L746.0,249.8L803.4,235.4L814.6,246.8L855.8,264.7L889.1,286.8L887.0,293.6L897.5,302.9L897.5,308.4L890.5,314.6L891.2,319.5L848.2,395.0L803.4,395.0L794.7,390.6L750.0,394.3L737.7,426.6L674.4,471.3L649.8,423.4L629.7,408.9Z" },
  { id: "boksitogorsk", x: 885, y: 428, d: "M673.6,484.9L674.4,471.3L737.7,426.6L750.0,394.3L794.7,390.6L803.4,395.0L848.2,395.0L891.2,319.5L930.3,333.2L922.1,344.9L920.9,384.5L924.4,391.5L946.6,396.2L949.0,417.1L934.9,407.8L933.8,414.8L936.1,431.1L929.1,442.8L919.7,449.7L929.1,461.4L918.6,475.4L919.7,482.4L915.1,494.0L902.2,494.0L890.5,505.7L880.0,503.3L875.3,512.7L864.8,501.0L848.5,524.3L848.5,533.6L843.8,536.0L847.3,543.0L841.4,545.3L833.3,545.3L795.9,526.6L777.2,529.0L771.3,540.6L763.1,538.3L751.5,526.6L740.9,526.6L735.1,510.3L717.6,482.4L703.5,487.0L688.3,484.7L683.7,494.0L676.7,498.7L669.1,494.0Z" }
]);

let managementContext = null;

function getAppSessionToken() {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function setAppSessionToken(token) {
  try {
    const previous = sessionStorage.getItem(SESSION_STORAGE_KEY) || "";
    const next = String(token || "");

    if (next) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, next);
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }

    if (previous !== next) {
      apiJsonCache.clear();
      selectedOutageKind = "";
      outageDivisionsState = [];
      outageDetailLoadingIds.clear();
    }
  } catch {}
}

async function fetchJsonWithEtag(url, options = {}, cacheKey = url) {
  const previous = apiJsonCache.get(cacheKey) || null;
  const headers = new Headers(options.headers || {});

  if (previous?.etag) {
    headers.set("If-None-Match", previous.etag);
  }

  let response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers
  });

  if (response.status === 304 && previous) {
    return {
      response,
      payload: previous.payload,
      notModified: true
    };
  }

  if (response.status === 304 && !previous) {
    headers.delete("If-None-Match");
    response = await fetch(url, {
      ...options,
      cache: "no-store",
      headers
    });
  }

  const payload = await response.json().catch(() => null);

  if (response.ok) {
    const etag = response.headers.get("etag");

    if (etag) {
      apiJsonCache.set(cacheKey, {
        etag,
        payload
      });
    }
  }

  return {
    response,
    payload,
    notModified: false
  };
}

function isAppVisible() {
  return document.visibilityState !== "hidden";
}

function getMaxInitData() {
  try {
    return window.WebApp?.initData || "";
  } catch {
    return "";
  }
}


let maxBridgePromise = null;

function isLowBandwidthConnection() {
  try {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (!connection) {
      return false;
    }

    return Boolean(
      connection.saveData ||
      ["slow-2g", "2g"].includes(
        String(connection.effectiveType || "")
      )
    );
  } catch {
    return false;
  }
}

function applyConnectionMode() {
  if (isLowBandwidthConnection()) {
    document.body.classList.add(
      "low-bandwidth"
    );
  }
}

function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = STARTUP_REQUEST_TIMEOUT_MS
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  return fetch(
    url,
    {
      ...options,
      signal: controller.signal
    }
  ).finally(
    () => clearTimeout(timer)
  );
}

function loadMaxBridge(
  timeoutMs = MAX_BRIDGE_TIMEOUT_MS
) {
  if (
    window.WebApp?.initData
  ) {
    return Promise.resolve(
      window.WebApp
    );
  }

  if (maxBridgePromise) {
    return maxBridgePromise;
  }

  maxBridgePromise =
    new Promise(
      (resolve, reject) => {
        const existing =
          document.querySelector(
            'script[data-max-bridge="true"]'
          );

        if (existing) {
          existing.remove();
        }

        const script =
          document.createElement(
            "script"
          );

        script.src =
          MAX_BRIDGE_URL;

        script.async = true;
        script.dataset.maxBridge =
          "true";

        let settled = false;

        const finish = (
          callback,
          value
        ) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timer);
          callback(value);
        };

        script.onload = () => {
          if (window.WebApp) {
            finish(
              resolve,
              window.WebApp
            );
          } else {
            finish(
              reject,
              new Error(
                "MAX Bridge загрузился без WebApp."
              )
            );
          }
        };

        script.onerror = () => {
          finish(
            reject,
            new Error(
              "Не удалось загрузить MAX Bridge."
            )
          );
        };

        const timer =
          setTimeout(
            () => {
              script.remove();

              finish(
                reject,
                new Error(
                  "MAX Bridge загружается слишком долго."
                )
              );
            },
            timeoutMs
          );

        document.head.appendChild(
          script
        );
      }
    ).catch(
      (error) => {
        /*
          Не кэшируем неудачу навсегда:
          следующий клик «Войти» сможет повторить загрузку.
        */
        maxBridgePromise = null;
        throw error;
      }
    );

  return maxBridgePromise;
}

async function waitForMaxInitData() {
  const current =
    getMaxInitData();

  if (current) {
    return current;
  }

  try {
    await loadMaxBridge();
  } catch {
    return "";
  }

  /*
    На части мобильных WebView объект появляется чуть позже onload.
  */
  const startedAt =
    Date.now();

  while (
    Date.now() - startedAt <
    1_500
  ) {
    const initData =
      getMaxInitData();

    if (initData) {
      return initData;
    }

    await new Promise(
      (resolve) =>
        setTimeout(resolve, 100)
    );
  }

  return getMaxInitData();
}

function loadDeferredLogos() {
  /*
    Эти картинки НЕ участвуют в первоначальном window.load,
    поэтому медленный внешний сервер логотипа больше не может
    держать запуск Mini App.
  */
  if (isLowBandwidthConnection()) {
    return;
  }

  document
    .querySelectorAll(
      "img[data-logo-src]"
    )
    .forEach(
      (image) => {
        const source =
          image.dataset.logoSrc;

        if (!source) {
          return;
        }

        image.onload = () => {
          image
            .closest(
              ".logo-surface"
            )
            ?.classList.add(
              "is-logo-loaded"
            );
        };

        image.onerror = () => {
          image.removeAttribute(
            "src"
          );
        };

        image.src = source;
      }
    );
}

function startNonBlockingExternalResources() {
  /*
    Сначала сообщаем WebView, что сама страница уже загружена.
    После этого в фоне подключаем Bridge и необязательный логотип.
  */
  loadDeferredLogos();

  loadMaxBridge()
    .catch(() => {
      /*
        Это не ошибка запуска страницы.
        При входе пользователь сможет повторить попытку.
      */
    });
}

applyConnectionMode();

window.addEventListener(
  "load",
  () => {
    setTimeout(
      startNonBlockingExternalResources,
      0
    );
  },
  { once: true }
);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeRoleColor(value, fallback = "#39c6e6") {
  const clean = String(value || "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(clean) ? clean : fallback;
}

function roleColorRgba(value, alpha = 1) {
  const color = normalizeRoleColor(value).slice(1);
  const r = Number.parseInt(color.slice(0, 2), 16);
  const g = Number.parseInt(color.slice(2, 4), 16);
  const b = Number.parseInt(color.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyCurrentRoleColor(color) {
  const clean = normalizeRoleColor(color);
  userRoleBadge.style.color = clean;
  userRoleBadge.style.borderColor = roleColorRgba(clean, 0.34);
  userRoleBadge.style.background = roleColorRgba(clean, 0.10);
  userRoleBadge.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,.03), 0 0 18px ${roleColorRgba(clean, 0.08)}`;
}

function splitDateTime(value) {
  const [date = "", time = ""] =
    String(value || "").split(/\s+/);

  return { date, time };
}

function showLoginError(message) {
  loginError.textContent =
    message || "Ошибка авторизации";

  loginError.hidden = false;
}

function clearLoginError() {
  loginError.hidden = true;
  loginError.textContent = "";
}

function hasPanelAccess(
  panelId
) {
  return Boolean(
    currentUser?.panelIds?.includes(
      panelId
    )
  );
}

const PANEL_ACCESS_META = {
  monitoring: {
    title: "Активные отключения",
    description: "У вашей текущей роли нет доступа к панели «Активные отключения»."
  },
  dispatcher: {
    title: "Интерфейс Диспетчера",
    description: "У вашей текущей роли нет доступа к панели «Интерфейс Диспетчера»."
  },
  "executive-monitoring": {
    title: "Диспетчерский мониторинг",
    description: "У вашей текущей роли нет доступа к панели «Диспетчерский мониторинг»."
  },
  "excel-exports": {
    title: "Excel выгрузки",
    description: "У вашей текущей роли нет доступа к панели «Excel выгрузки»."
  },
  "system-control": {
    title: "Центр управления системой",
    description: "У вашей текущей роли нет доступа к панели «Центр управления системой»."
  }
};

function showPanelAccessDenied(panelId) {
  const meta = PANEL_ACCESS_META[panelId] || {
    title: "Раздел недоступен",
    description: "У вашей текущей роли нет доступа к выбранной панели."
  };

  openModal({
    type: "denied",
    eyebrow: "ДОСТУП ПО РОЛИ",
    title: "Недостаточно прав",
    message: `${meta.description} Обратитесь к администратору приложения, если этот раздел нужен для вашей работы.`
  });
}

function applyModuleAccessState(button, status, panelId, allowedText = "ДОСТУПЕН") {
  if (!button) return;
  const allowed = hasPanelAccess(panelId);
  button.hidden = false;
  button.classList.toggle("is-access-locked", !allowed);
  button.setAttribute("aria-disabled", allowed ? "false" : "true");
  button.dataset.accessPanel = panelId;

  if (status) {
    status.classList.toggle("module-status-denied", !allowed);
    status.classList.toggle("module-status-live", allowed && panelId !== "system-control");
    status.textContent = allowed ? allowedText : "НЕТ ДОСТУПА";
  }
}

function setUserUi(user) {
  currentUser = {
    username:
      String(
        user?.username || ""
      ),
    fullName:
      String(
        user?.fullName ||
        "Пользователь"
      ),
    isDispatcher:
      Boolean(
        user?.isDispatcher
      ),
    isDeveloper:
      Boolean(
        user?.isDeveloper
      ),
    canManageRoles:
      Boolean(
        user?.canManageRoles ??
        user?.isDeveloper
      ),
    roleIds:
      Array.isArray(
        user?.roleIds
      )
        ? [...user.roleIds]
        : [],
    roleNames:
      Array.isArray(
        user?.roleNames
      )
        ? [...user.roleNames]
        : [],
    roles:
      Array.isArray(
        user?.roles
      )
        ? user.roles.map((role) => ({
            ...role,
            color: normalizeRoleColor(role?.color)
          }))
        : [],
    primaryRoleColor:
      normalizeRoleColor(
        user?.primaryRoleColor ||
        user?.roles?.find?.((role) => role?.id === "developer")?.color ||
        user?.roles?.find?.((role) => role?.id === "dispatcher")?.color ||
        user?.roles?.find?.((role) => role?.id !== "user")?.color ||
        user?.roles?.[0]?.color
      ),
    panelIds:
      Array.isArray(
        user?.panelIds
      )
        ? [...user.panelIds]
        : (
            user?.isDeveloper
              ? [
                  "monitoring",
                  "executive-monitoring",
                  "excel-exports",
                  "system-control"
                ]
              : user?.isDispatcher
                ? [
                    "monitoring",
                    "dispatcher"
                  ]
                : [
                    "monitoring"
                  ]
          ),
    dispatcherDivisionId:
      String(
        user?.dispatcherDivisionId || ""
      ),
    dispatcherDivisionName:
      String(
        user?.dispatcherDivisionName || ""
      ),
    dispatcherAllDivisions:
      Boolean(
        user?.dispatcherAllDivisions
      )
  };

  userFullName.textContent =
    currentUser.fullName;

  const roleText =
    currentUser.roleNames.length
      ? currentUser.roleNames
          .slice(0, 2)
          .join(" · ")
      : currentUser.isDeveloper
        ? "Разработчик"
        : currentUser.isDispatcher
          ? "Диспетчер"
          : "Пользователь";

  userRoleBadge.textContent =
    roleText;

  userRoleBadge.classList.toggle(
    "is-dispatcher",
    hasPanelAccess(
      "dispatcher"
    ) &&
    !currentUser.isDeveloper
  );

  userRoleBadge.classList.toggle(
    "is-developer",
    currentUser.isDeveloper
  );

  applyCurrentRoleColor(
    currentUser.primaryRoleColor
  );

  dispatcherCardStatus.textContent =
    hasPanelAccess("dispatcher")
      ? (
          currentUser?.dispatcherAllDivisions
            ? "КОНТУР: ВСЕ ПОДРАЗДЕЛЕНИЯ"
            : currentUser?.dispatcherDivisionName
              ? `КОНТУР: ${currentUser.dispatcherDivisionName}`
              : "ДОСТУП РАЗРЕШЁН"
        )
      : "НЕТ ДОСТУПА";

  executiveCardStatus.textContent =
    hasPanelAccess("executive-monitoring")
      ? (
          currentUser?.dispatcherAllDivisions
            ? "КОНТУР: ВСЕ ПОДРАЗДЕЛЕНИЯ"
            : currentUser?.dispatcherDivisionName
              ? `ФОКУС: ${currentUser.dispatcherDivisionName}`
              : "СВОДНЫЙ ДОСТУП"
        )
      : "НЕТ ДОСТУПА";

  applyModuleAccessState(
    openMonitoringButton,
    monitoringCardStatus,
    "monitoring",
    "ДОСТУПЕН"
  );
  applyModuleAccessState(
    openDispatcherButton,
    dispatcherCardStatus,
    "dispatcher",
    dispatcherCardStatus.textContent
  );
  applyModuleAccessState(
    openExecutiveButton,
    executiveCardStatus,
    "executive-monitoring",
    executiveCardStatus.textContent
  );
  applyModuleAccessState(
    openExcelExportsButton,
    excelExportsCardStatus,
    "excel-exports",
    "XLSX"
  );
  applyModuleAccessState(
    openAdminButton,
    adminCardStatus,
    "system-control",
    currentUser.isDeveloper ? "РОЛЬ: РАЗРАБОТЧИК" : "ДОСТУП РАЗРЕШЁН"
  );

  const visibleModules = 5;

  moduleCount.textContent =
    `${visibleModules} ${
      visibleModules === 1
        ? "модуль"
        : visibleModules < 5
          ? "модуля"
          : "модулей"
    }`;
}

function showLoginScreen() {
  stopAutoRefresh();
  stopHeartbeat();
  stopAdminRefresh();
  stopDispatcherRefresh();
  stopExecutiveRefresh();
  hideViewLoading();

  currentUser = null;
  currentView = "home";

  document.body.classList.remove("authenticated");
  document.body.classList.add("auth-pending");
  authScreen.classList.remove("is-leaving");

  homeView.classList.add("is-active");
  monitoringView.classList.remove("is-active");
  dispatcherView.classList.remove("is-active");
  executiveView.classList.remove("is-active");
  requestsView?.classList.remove("is-active");
  workordersView?.classList.remove("is-active");
  excelExportsView.classList.remove("is-active");
  adminView.classList.remove("is-active");

  setTimeout(
    () => usernameInput?.focus(),
    700
  );
}

function showApplication(user) {
  setUserUi(user);

  document.body.classList.add("authenticated");
  document.body.classList.remove("auth-pending");
  authScreen.classList.add("is-leaving");

  clearLoginError();
  navigateHome();
  attachMaxExitHandlers();
  startHeartbeat();
  loadSystemState();
}

function setView(view) {
  currentView = view;

  homeView.classList.toggle(
    "is-active",
    view === "home"
  );

  monitoringView.classList.toggle(
    "is-active",
    view === "monitoring"
  );

  dispatcherView.classList.toggle(
    "is-active",
    view === "dispatcher"
  );

  executiveView.classList.toggle(
    "is-active",
    view === "executive"
  );

  requestsView?.classList.toggle(
    "is-active",
    view === "requests"
  );

  workordersView?.classList.toggle(
    "is-active",
    view === "workorders"
  );

  excelExportsView.classList.toggle(
    "is-active",
    view === "excel-exports"
  );

  adminView.classList.toggle(
    "is-active",
    view === "admin"
  );

  if (view !== "monitoring") {
    stopAutoRefresh();
  }

  if (view !== "admin") {
    stopAdminRefresh();
  }

  if (view !== "dispatcher") {
    stopDispatcherRefresh();
  }

  if (view !== "executive") {
    stopExecutiveRefresh();
  }

  if (view !== "requests") {
    stopRequestsRefresh();
  }

  if (view !== "workorders") {
    stopWorkordersRefresh();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function navigateHome() {
  hideViewLoading();
  setView("home");
}

function outageKindMeta(kind = selectedOutageKind) {
  const planned = kind === "planned";

  return planned
    ? {
        kind: "planned",
        label: "Плановые отключения",
        eyebrow: "ПЛАНОВЫЕ ОТКЛЮЧЕНИЯ",
        activeLabel: "Активные плановые отключения",
        copy: "Сводные счётчики из последнего сообщения «СК-11 OMS • Плановые отключения».",
        error: "Не удалось получить плановые отключения."
      }
    : {
        kind: "emergency",
        label: "Аварийные отключения",
        eyebrow: "АКТИВНЫЕ ОТКЛЮЧЕНИЯ",
        activeLabel: "Активные аварийные отключения",
        copy: "Сводные счётчики из последнего сообщения «СК-11 OMS • Аварийные отключения».",
        error: "Не удалось получить аварийные отключения."
      };
}

function showOutageTypeSelector({ refresh = true } = {}) {
  loadVersion += 1;
  selectedOutageKind = "";
  expandedOutageDivisionIds.clear();
  outageDetailLoadingIds.clear();
  outageDivisionsState = [];
  outageSourceUpdatedAt = "";

  activeOutagesSelector.hidden = false;
  outageDetailsView.hidden = true;
  monitoringBackLabel.textContent = "Главное меню";
  dashboardStatus.textContent = "Выберите тип отключений";

  if (refresh) {
    loadOutageTypeOverview();
  }
}

function openOutageKind(kind) {
  loadVersion += 1;
  selectedOutageKind = kind === "planned" ? "planned" : "emergency";
  expandedOutageDivisionIds.clear();
  outageDetailLoadingIds.clear();
  outageDivisionsState = [];
  outageSourceUpdatedAt = "";

  const meta = outageKindMeta(selectedOutageKind);
  activeOutagesSelector.hidden = true;
  outageDetailsView.hidden = false;
  monitoringBackLabel.textContent = "Активные отключения";
  monitoringDetailEyebrow.textContent = meta.eyebrow;
  monitoringDetailTitle.textContent = meta.label;
  monitoringDetailCopy.textContent = meta.copy;
  totalOutagesLabel.textContent = meta.activeLabel;
  totalOutagesHint.textContent = "по последней сводке СК-11 OMS";
  monitoringHeadingLabel.textContent = "ПОДРАЗДЕЛЕНИЯ";
  monitoringHeadingTitle.textContent = meta.label;
  dashboardStatus.textContent = "Получение последней сводки СК-11 OMS";
  totalOutages.textContent = "—";
  updatedAt.textContent = "Обновлено: —";
  divisionGrid.innerHTML = `
    <div class="monitoring-loading-card">
      Получение последней сводки СК-11 OMS…
    </div>
  `;

  loadAllDivisions();
}

function navigateMonitoring() {
  if (!hasPanelAccess("monitoring")) {
    showPanelAccessDenied("monitoring");
    return;
  }

  if (
    currentSystemState.mode !== "normal" &&
    !hasPanelAccess("system-control")
  ) {
    const title = currentSystemState.mode === "maintenance"
      ? "Технические работы"
      : "Система временно остановлена";

    openModal({
      type: "denied",
      eyebrow: "СОСТОЯНИЕ СИСТЕМЫ",
      title,
      message: currentSystemState.message || "Оперативный доступ временно ограничен."
    });
    return;
  }

  setView("monitoring");
  showOutageTypeSelector({ refresh: true });
  startAutoRefresh();
}

async function loadDispatcherDashboard({
  openView = false,
  quiet = false
} = {}) {
  const sessionToken =
    getAppSessionToken();

  const params =
    new URLSearchParams();

  if (selectedDispatcherGroupId) {
    params.set(
      "group",
      selectedDispatcherGroupId
    );
  }

  if (selectedDispatcherUnitId) {
    params.set(
      "unit",
      selectedDispatcherUnitId
    );
  }

  if (!quiet && dispatcherRefreshButton) {
    dispatcherRefreshButton.disabled = true;
    dispatcherRefreshButton.classList.add(
      "is-loading"
    );
  }

  try {
    const query =
      params.toString()
        ? `?${params.toString()}`
        : "";

    const {
      response,
      payload,
      notModified
    } = await fetchJsonWithEtag(
      `${API_DISPATCHER}${query}`,
      {
        method: "GET",
        credentials: "include",
        headers: sessionToken
          ? {
              "X-App-Session":
                sessionToken
            }
          : {}
      },
      `dispatcher:${query}`
    );

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return false;
    }

    if (response.status === 403) {
      if (currentView === "dispatcher") {
        navigateHome();
      }

      openModal({
        type: "denied",
        title: "Доступ ограничен",
        message:
          payload?.message ||
          "У вашей роли нет доступа к интерфейсу диспетчера"
      });
      return false;
    }

    if (!response.ok && !notModified) {
      throw new Error(
        payload?.error ||
        "Не удалось загрузить интерфейс диспетчера"
      );
    }

    renderDispatcherDashboard(payload);

    if (openView) {
      setView("dispatcher");
      startDispatcherRefresh();
    }

    return true;
  } catch (error) {
    if (!quiet) {
      openModal({
        type: "denied",
        eyebrow: "ОШИБКА ДАННЫХ",
        title: "Не удалось обновить интерфейс",
        message:
          error instanceof Error
            ? error.message
            : "Попробуйте ещё раз."
      });
    }

    return false;
  } finally {
    if (dispatcherRefreshButton) {
      dispatcherRefreshButton.disabled = false;
      dispatcherRefreshButton.classList.remove(
        "is-loading"
      );
    }
  }
}

function showViewLoading(text = "Загрузка данных…") {
  viewLoadingToken += 1;
  if (viewLoadingText) viewLoadingText.textContent = text;
  if (viewLoadingOverlay) viewLoadingOverlay.hidden = false;
  return viewLoadingToken;
}

function hideViewLoading(token) {
  // Скрываем только «свой» лоадер: если пользователь уже открыл другой
  // раздел, его загрузка продолжает показываться.
  if (token !== undefined && token !== viewLoadingToken) return;
  if (viewLoadingOverlay) viewLoadingOverlay.hidden = true;
}

/*
  Переход в раздел происходит сразу по клику, а данные догружаются
  под экраном загрузки. Раньше экран переключался только после ответа
  сервера, из-за чего клик казался «несработавшим».
*/
async function openViewWithLoading(view, load, startRefresh, loadingText) {
  setView(view);
  const token = showViewLoading(loadingText);

  try {
    const ok = await load();

    if (currentView !== view) {
      return;
    }

    if (ok) {
      startRefresh();
    } else {
      navigateHome();
    }
  } finally {
    hideViewLoading(token);
  }
}

async function navigateDispatcher() {
  if (!hasPanelAccess("dispatcher")) {
    showPanelAccessDenied("dispatcher");
    return;
  }

  await openViewWithLoading(
    "dispatcher",
    () => loadDispatcherDashboard(),
    startDispatcherRefresh,
    "Загрузка интерфейса диспетчера…"
  );
}

function startDispatcherRefresh() {
  stopDispatcherRefresh();

  dispatcherRefreshTimer =
    setInterval(
      () => {
        if (
          currentView ===
          "dispatcher" &&
          isAppVisible()
        ) {
          loadDispatcherDashboard({
            quiet: true
          });
        }
      },
      DISPATCHER_REFRESH_INTERVAL_MS
    );
}

function stopDispatcherRefresh() {
  if (dispatcherRefreshTimer) {
    clearInterval(
      dispatcherRefreshTimer
    );
    dispatcherRefreshTimer = null;
  }
}


function executiveEl(id) {
  return document.getElementById(id);
}

function renderExecutiveRanking(targetId, items, emptyText) {
  const target = executiveEl(targetId);
  if (!target) return;

  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    target.innerHTML = `<div class="executive-empty">${escapeHtml(emptyText || "Нет данных")}</div>`;
    return;
  }

  target.innerHTML = list.map((item, index) => `
    <div class="executive-ranking-row">
      <div class="executive-ranking-main">
        <span class="executive-ranking-index">${index + 1}</span>
        <span class="executive-ranking-name">${escapeHtml(item?.name || "—")}</span>
      </div>
      <strong>${Number(item?.count || 0)}</strong>
    </div>
  `).join("");
}

function setExecutiveRequestCounts(counts) {
  const values = {
    review: Number(counts?.review || 0),
    approved: Number(counts?.approved || 0),
    open: Number(counts?.open || 0),
    closed: Number(counts?.closed || 0),
    acknowledged: Number(counts?.acknowledged || 0),
    ending: Number(counts?.ending || 0),
    total: Number(counts?.total || 0)
  };

  executiveEl("executiveReqReview").textContent = values.review;
  executiveEl("executiveReqApproved").textContent = values.approved;
  executiveEl("executiveReqOpen").textContent = values.open;
  executiveEl("executiveReqClosed").textContent = values.closed;
  executiveEl("executiveReqAcknowledged").textContent = values.acknowledged;
  executiveEl("executiveReqEnding").textContent = values.ending;
  executiveEl("executiveRequestsTotal").textContent = values.total;

  renderDispatcherDonutChart(executiveEl("executiveRequestsChart"), [
    { label: "В рассмотрении", value: values.review, color: "#43c0ff" },
    { label: "Разрешена", value: values.approved, color: "#37f29f" },
    { label: "Открыта", value: values.open, color: "#8f7dff" },
    { label: "Закрыта", value: values.closed, color: "#ff587e" },
    { label: "Принята к сведению", value: values.acknowledged, color: "#ffc85e" },
    { label: "Заканчиваются", value: values.ending, color: "#fb7185" }
  ]);
}

function setExecutiveWorkorderCounts(counts) {
  const values = {
    registered: Number(counts?.registered || 0),
    created: Number(counts?.created || 0),
    admission: Number(counts?.admission || 0),
    preparation: Number(counts?.preparation || 0),
    break: Number(counts?.break || 0),
    total: Number(counts?.total || 0)
  };

  executiveEl("executiveWorkordersRegistered").textContent = values.registered;
  executiveEl("executiveWorkordersCreated").textContent = values.created;
  executiveEl("executiveWorkordersAdmission").textContent = values.admission;
  executiveEl("executiveWorkordersPreparation").textContent = values.preparation;
  executiveEl("executiveWorkordersBreak").textContent = values.break;
  executiveEl("executiveWorkordersTotal").textContent = values.total;

  renderDispatcherDonutChart(executiveEl("executiveWorkordersChart"), [
    { label: "Зарегистрирован", value: values.registered, color: "#2ed7c9" },
    { label: "Создано", value: values.created, color: "#4d95ff" },
    { label: "Допуск", value: values.admission, color: "#7d55ff" },
    { label: "Подготовка р.м.", value: values.preparation, color: "#f3a722" },
    { label: "Перерыв", value: values.break, color: "#ff4d80" }
  ]);
}


function renderExecutiveDelta(targetId, delta, suffix = "с начала дня") {
  const target = executiveEl(targetId);
  if (!target) return;

  target.classList.remove("is-up", "is-down", "is-neutral", "is-unavailable");

  if (!delta?.available) {
    target.textContent = "история формируется";
    target.classList.add("is-unavailable");
    return;
  }

  const value = Number(delta.value || 0);

  if (value > 0) {
    target.textContent = `+${value}${suffix ? ` ${suffix}` : ""}`;
    target.classList.add("is-up");
  } else if (value < 0) {
    target.textContent = `${value}${suffix ? ` ${suffix}` : ""}`;
    target.classList.add("is-down");
  } else {
    target.textContent = `без изменений`;
    target.classList.add("is-neutral");
  }
}

function renderExecutiveSparkline(targetId, history, metric, fallbackValue = 0) {
  const target = executiveEl(targetId);
  if (!target) return;

  const list = (Array.isArray(history) ? history : [])
    .map((item) => {
      const raw = item?.[metric];
      if (raw === null || raw === undefined || raw === "") return null;
      const value = Number(raw);
      if (!Number.isFinite(value)) return null;
      return {
        label: String(item?.label || ""),
        value
      };
    })
    .filter(Boolean)
    .slice(-16);

  if (!list.length) {
    list.push({ label: "сейчас", value: Number(fallbackValue || 0) });
  }

  const width = 420;
  const height = 150;
  const padX = 14;
  const padTop = 16;
  const padBottom = 30;
  const usableWidth = width - padX * 2;
  const usableHeight = height - padTop - padBottom;
  const values = list.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const rangePadding = Math.max(1, span * 0.18);
  const chartMin = Math.max(0, min - rangePadding);
  const chartMax = max + rangePadding;
  const chartSpan = Math.max(1, chartMax - chartMin);

  const points = list.map((item, index) => {
    const x = list.length === 1
      ? width / 2
      : padX + (index / (list.length - 1)) * usableWidth;
    const y = padTop + usableHeight - ((item.value - chartMin) / chartSpan) * usableHeight;
    return { ...item, x, y };
  });

  const polyline = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const area = points.length
    ? `M ${points[0].x.toFixed(2)} ${height - padBottom} L ${points.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" L ")} L ${points.at(-1).x.toFixed(2)} ${height - padBottom} Z`
    : "";
  const firstPoint = points[0] || null;
  const last = points.at(-1);
  const firstLabel = escapeHtml(firstPoint?.label || "");
  const lastLabel = escapeHtml(last?.label || "");
  const gradientId = `exec-gradient-${targetId}`;
  const isSingleLabel = firstLabel && firstLabel === lastLabel;

  target.innerHTML = `
    <div class="executive-sparkline-canvas">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="currentColor" stop-opacity=".34"></stop>
            <stop offset="100%" stop-color="currentColor" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        <line x1="${padX}" y1="${height - padBottom}" x2="${width - padX}" y2="${height - padBottom}" class="executive-sparkline-axis"></line>
        <path d="${area}" fill="url(#${gradientId})"></path>
        <polyline points="${polyline}" class="executive-sparkline-line"></polyline>
        ${last ? `<circle cx="${last.x}" cy="${last.y}" r="5" class="executive-sparkline-point"></circle>` : ""}
      </svg>
    </div>
    <div class="executive-sparkline-meta ${isSingleLabel ? "is-single" : ""}">
      ${firstLabel ? `<span class="executive-sparkline-chip is-start">${isSingleLabel ? "Сводка" : "Начало"}: ${firstLabel}</span>` : ""}
      ${!isSingleLabel && lastLabel ? `<span class="executive-sparkline-chip is-end">Последняя: ${lastLabel}</span>` : ""}
    </div>
  `;
}

function renderExecutiveDivisionTable(rows, selectedGroupId = "") {
  const body = executiveEl("executiveDivisionTableBody");
  if (!body) return;

  const list = Array.isArray(rows) ? rows : [];

  if (!list.length) {
    body.innerHTML = `<tr><td colspan="7" class="executive-table-empty">Нет доступных подразделений</td></tr>`;
    return;
  }

  body.innerHTML = list.map((row) => {
    const tone = String(row?.status?.tone || "muted");
    const selectable = row?.selectable !== false;
    const selected = selectable && String(row?.id || "") === String(selectedGroupId || "");
    const rowCopy = `
      <strong>${escapeHtml(row?.name || "—")}</strong>
      <small>${escapeHtml(row?.description || `${Number(row?.units || 0)} РЭС / районов`)}</small>
    `;

    return `
      <tr class="${selected ? "is-selected" : ""}">
        <td>
          ${selectable
            ? `<button class="executive-division-link" type="button" data-executive-table-group="${escapeHtml(row?.id || "")}">${rowCopy}</button>`
            : `<div class="executive-division-link is-static">${rowCopy}</div>`}
        </td>
        <td><span class="executive-status-chip is-${escapeHtml(tone)}">${escapeHtml(row?.status?.label || "—")}</span></td>
        <td><strong class="executive-table-number is-outage">${Number(row?.outages || 0)}</strong></td>
        <td><strong class="executive-table-number is-appeal">${Number(row?.appeals || 0)}</strong></td>
        <td><strong class="executive-table-number">${Number(row?.requests || 0)}</strong><small class="executive-table-sub">активно: ${Number(row?.openRequests || 0)}</small></td>
        <td><strong class="executive-table-number">${Number(row?.workorders || 0)}</strong><small class="executive-table-sub">перерыв: ${Number(row?.workBreaks || 0)}</small></td>
        <td><strong class="executive-table-number">${Number(row?.units || 0)}</strong></td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll("[data-executive-table-group]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedExecutiveGroupId = String(button.dataset.executiveTableGroup || "");
      selectedExecutiveUnitId = "";
      loadExecutiveDashboard();
    });
  });
}

function executiveMapMetricBadge(zone, geometry) {
  const outages = Number(zone?.outages || 0);
  const appeals = Number(zone?.appeals || 0);
  const value = `${outages} / ${appeals}`;
  const width = Math.max(54, value.length * 7 + 20);
  const anchor = executiveMapLabelAnchor(geometry);
  const left = anchor.x - width / 2;
  const top = anchor.y + 6;

  return `
    <g class="executive-map-metric" transform="translate(${left.toFixed(1)} ${top.toFixed(1)})">
      <rect width="${width}" height="22" rx="4"></rect>
      <text x="${width / 2}" y="15" text-anchor="middle">${outages} / ${appeals}</text>
    </g>
  `;
}

function executiveMapLabelAnchor(geometry) {
  return {
    x: geometry.labelX ?? geometry.x,
    y: geometry.labelY ?? geometry.y
  };
}

function renderExecutiveRegionalMap(mapPayload) {
  if (!executiveRegionalMap) return;

  const zones = Array.isArray(mapPayload?.zones) ? mapPayload.zones : [];
  const zoneMap = new Map(zones.map((zone) => [String(zone?.id || ""), zone]));
  const activeZones = zones.filter((zone) => zone?.enabled !== false && Number(zone?.outages || 0) > 0);
  const totalOutages = activeZones.reduce((sum, zone) => sum + Number(zone?.outages || 0), 0);
  const totalAppeals = zones.reduce((sum, zone) => sum + Number(zone?.appeals || 0), 0);
  const maxOutages = Math.max(1, ...zones.map((zone) => Number(zone?.outages || 0)));

  const regionMarkup = EXECUTIVE_MAP_GEOMETRY.map((geometry) => {
    const zone = zoneMap.get(geometry.id) || {
      id: geometry.id,
      name: geometry.id,
      shortName: geometry.id,
      enabled: false,
      outages: 0,
      appeals: 0
    };
    const outages = Number(zone?.outages || 0);
    const appeals = Number(zone?.appeals || 0);
    const enabled = zone?.enabled !== false;
    const intensity = enabled && outages > 0
      ? Math.min(.46, .14 + (outages / maxOutages) * .32)
      : 0;
    const classes = [
      "executive-map-zone",
      enabled ? "is-enabled" : "is-disabled",
      outages > 0 ? "has-outages" : "is-clear"
    ].join(" ");
    const label = escapeHtml(zone?.shortName || zone?.name || geometry.id);
    const title = escapeHtml(
      `${zone?.name || label}: ${outages} отключений · ${appeals} обращений${enabled ? "" : " · отключено в настройках"}`
    );

    const anchor = executiveMapLabelAnchor(geometry);
    const hasLeader = anchor.x !== geometry.x || anchor.y !== geometry.y;

    return {
      shape: `
        <g class="${classes}" data-map-zone="${escapeHtml(geometry.id)}" style="--zone-alert-alpha:${intensity.toFixed(3)}">
          <title>${title}</title>
          <path class="executive-map-shape" d="${geometry.d}"></path>
          ${outages > 0 ? `<circle class="executive-map-pulse" cx="${geometry.x}" cy="${geometry.y}" r="7"></circle>` : ""}
        </g>
      `,
      // Подписи рисуются отдельным слоем поверх всех районов,
      // чтобы граница соседнего района не перечёркивала текст.
      label: `
        <g class="${classes} executive-map-label" aria-hidden="true">
          ${hasLeader ? `<path class="executive-map-leader" d="M${geometry.x} ${geometry.y}L${anchor.x} ${anchor.y + 6}"></path><circle class="executive-map-leader-dot" cx="${geometry.x}" cy="${geometry.y}" r="2.5"></circle>` : ""}
          <text class="executive-map-zone-name" x="${anchor.x}" y="${anchor.y - 3}" text-anchor="middle">${label}</text>
          ${enabled ? executiveMapMetricBadge(zone, geometry) : ""}
        </g>
      `
    };
  });

  const shapeMarkup = regionMarkup.map((item) => item.shape).join("");
  const labelMarkup = regionMarkup.map((item) => item.label).join("");

  executiveRegionalMap.innerHTML = `
    <div class="executive-map-stage">
      <svg class="executive-map-svg" viewBox="0 0 ${EXECUTIVE_MAP_VIEWBOX.width} ${EXECUTIVE_MAP_VIEWBOX.height}" role="img" aria-label="Карта Санкт-Петербурга и муниципальных районов Ленинградской области">
        <rect class="executive-map-sea" x="0" y="0" width="${EXECUTIVE_MAP_VIEWBOX.width}" height="${EXECUTIVE_MAP_VIEWBOX.height}"></rect>
        <path class="executive-map-neighbors" d="${EXECUTIVE_MAP_BACKDROP.neighbors}"></path>
        <path class="executive-map-water executive-map-ladoga" d="${EXECUTIVE_MAP_BACKDROP.ladoga}"></path>
        <text class="executive-map-water-label" x="40" y="292">ФИНСКИЙ ЗАЛИВ</text>
        <text class="executive-map-water-label" x="455" y="150" text-anchor="middle">ЛАДОЖСКОЕ</text>
        <text class="executive-map-water-label" x="455" y="164" text-anchor="middle">ОЗЕРО</text>
        <text class="executive-map-context-label" x="70" y="40">ФИНЛЯНДИЯ</text>
        <text class="executive-map-context-label" x="560" y="40">КАРЕЛИЯ</text>
        <text class="executive-map-context-label" x="30" y="690">ЭСТОНИЯ</text>
        <text class="executive-map-context-label" x="560" y="640">НОВГОРОДСКАЯ ОБЛ.</text>

        <g class="executive-map-zones">${shapeMarkup}</g>
        <g class="executive-map-labels">${labelMarkup}</g>
      </svg>
    </div>
    <div class="executive-map-side-summary">
      <div class="executive-map-summary-kpi is-alert">
        <span>Зон с отключениями</span>
        <strong>${activeZones.length}</strong>
      </div>
      <div class="executive-map-summary-kpi">
        <span>Отключений на карте</span>
        <strong>${totalOutages}</strong>
      </div>
      <div class="executive-map-summary-kpi is-appeals">
        <span>Обращений</span>
        <strong>${totalAppeals}</strong>
      </div>
      <div class="executive-map-summary-note">
        <span>МЕТРИКА</span>
        <strong>Откл. / обращ.</strong>
        <small>Цифры в каждой зоне показываются в этом порядке.</small>
      </div>
    </div>
  `;

  if (executiveRegionalMapMeta) {
    executiveRegionalMapMeta.textContent = mapPayload?.updatedAt
      ? formatSourceUpdate(mapPayload.updatedAt)
      : "Оперативная география";
  }
}

function applyExecutiveLeaderSizing() {
  [
    "executiveHighlightOutage",
    "executiveHighlightAppeal",
    "executiveHighlightRequest",
    "executiveHighlightWorkorder"
  ].forEach((id) => {
    const element = executiveEl(id);
    if (!element) return;

    const text = String(element.textContent || "").trim();
    const normalizedLength = text.replace(/\s+/g, " ").length;

    element.classList.remove("is-long", "is-xlong");

    if (normalizedLength > 30) {
      element.classList.add("is-xlong");
    } else if (normalizedLength > 19) {
      element.classList.add("is-long");
    }
  });
}

function renderExecutiveDashboard(payload) {
  const groups = [{ id: "", name: "Все подразделения" }, ...(Array.isArray(payload?.availableGroups) ? payload.availableGroups : [])];
  const units = [{ id: "", name: "Все РЭС / районы" }, ...(Array.isArray(payload?.availableUnits) ? payload.availableUnits : [])];

  selectedExecutiveGroupId = String(payload?.filter?.groupId || "");
  selectedExecutiveUnitId = String(payload?.filter?.unitId || "");

  renderDispatcherSelectOptions(executiveEl("executiveGroupSelect"), groups, selectedExecutiveGroupId);
  renderDispatcherSelectOptions(executiveEl("executiveUnitSelect"), units, selectedExecutiveUnitId);

  const scopeTitle = selectedExecutiveUnitId
    ? `${payload?.filter?.groupName || ""} · ${payload?.filter?.unitName || ""}`
    : selectedExecutiveGroupId
      ? (payload?.filter?.groupName || "Подразделение")
      : "Все подразделения";

  executiveEl("executiveScopeTitle").textContent = scopeTitle;
  executiveEl("executiveHeroOutages").textContent = Number(payload?.headline?.outagesTotal || 0);
  executiveEl("executiveHeroAppeals").textContent = Number(payload?.headline?.appealsTotal || 0);

  renderExecutiveDelta("executiveDeltaOutages", payload?.deltas?.outages);
  renderExecutiveDelta("executiveDeltaAppeals", payload?.deltas?.appeals);

  executiveEl("executiveOutagesScope").textContent = payload?.outages?.scopeLabel || scopeTitle;
  executiveEl("executiveOutagesTotal").textContent = Number(payload?.outages?.total || 0);
  executiveEl("executiveOutagesAppeals").textContent = Number(payload?.outages?.appeals || 0);

  const overviewBits = [
    `${Number(payload?.scope?.groupCount || 0)} подразделений`,
    `${Number(payload?.scope?.visibleUnitCount || 0)} РЭС/районов`
  ];
  executiveEl("executiveOverviewMeta").textContent = overviewBits.join(" · ");

  const outageLeader = payload?.highlights?.outageLeader;
  executiveEl("executiveHighlightOutage").textContent = outageLeader?.name || "—";
  executiveEl("executiveHighlightOutageCount").textContent = `${Number(outageLeader?.count || 0)} отключений`;

  const appealLeader = payload?.highlights?.appealLeader;
  executiveEl("executiveHighlightAppeal").textContent = appealLeader?.name || "—";
  executiveEl("executiveHighlightAppealCount").textContent = `${Number(appealLeader?.count || 0)} обращений`;

  const requestLeader = payload?.highlights?.requestLeader;
  executiveEl("executiveHighlightRequest").textContent = requestLeader?.name || "—";
  executiveEl("executiveHighlightRequestCount").textContent = `${Number(requestLeader?.count || 0)} заявок`;

  const workorderLeader = payload?.highlights?.workorderLeader;
  executiveEl("executiveHighlightWorkorder").textContent = workorderLeader?.name || "—";
  executiveEl("executiveHighlightWorkorderCount").textContent = `${Number(workorderLeader?.count || 0)} НДР`;

  applyExecutiveLeaderSizing();

  setExecutiveRequestCounts(payload?.requests?.counts || {});
  setExecutiveWorkorderCounts(payload?.workorders?.counts || {});

  executiveEl("executiveOutageMeta").textContent = formatSourceUpdate(
    payload?.outages?.sourceUpdatedAt
  );
  executiveEl("executiveRequestsMeta").textContent = formatSourceUpdate(
    payload?.requests?.sourceUpdatedAt
  );
  executiveEl("executiveWorkordersMeta").textContent = formatSourceUpdate(
    payload?.workorders?.sourceUpdatedAt
  );

  renderExecutiveRanking("executiveOutageRanking", payload?.outages?.ranked, "Нет данных по отключениям");
  renderExecutiveRanking("executiveAppealRanking", payload?.outages?.rankedAppeals, "Нет обращений по активным отключениям");
  renderExecutiveRanking("executiveRequestRanking", payload?.requests?.ranked, "Нет данных по заявкам");
  renderExecutiveRanking("executiveWorkorderRanking", payload?.workorders?.ranked, "Нет данных по НДР");

  const history = Array.isArray(payload?.history) ? payload.history : [];
  const latestHistory = history.at(-1) || {};

  executiveEl("executiveTrendOutagesCurrent").textContent = Number(latestHistory?.outages ?? payload?.headline?.outagesTotal ?? 0);
  executiveEl("executiveTrendAppealsCurrent").textContent = Number(latestHistory?.appeals ?? payload?.headline?.appealsTotal ?? 0);
  executiveEl("executiveTrendRequestsCurrent").textContent = Number(latestHistory?.requests ?? payload?.headline?.requestsTotal ?? 0);
  executiveEl("executiveTrendWorkordersCurrent").textContent = Number(latestHistory?.workorders ?? payload?.headline?.workordersTotal ?? 0);

  renderExecutiveDelta("executiveTrendOutagesDelta", payload?.deltas?.outages, "");
  renderExecutiveDelta("executiveTrendAppealsDelta", payload?.deltas?.appeals, "");
  renderExecutiveDelta("executiveTrendRequestsDelta", payload?.deltas?.requests, "");
  renderExecutiveDelta("executiveTrendWorkordersDelta", payload?.deltas?.workorders, "");

  renderExecutiveSparkline("executiveTrendOutagesChart", history, "outages", payload?.headline?.outagesTotal);
  renderExecutiveSparkline("executiveTrendAppealsChart", history, "appeals", payload?.headline?.appealsTotal);
  renderExecutiveSparkline("executiveTrendRequestsChart", history, "requests", payload?.headline?.requestsTotal);
  renderExecutiveSparkline("executiveTrendWorkordersChart", history, "workorders", payload?.headline?.workordersTotal);

  executiveEl("executiveHistoryHint").textContent = history.length >= 2
    ? `${history.length} последних сводок · дельта с начала дня`
    : "История появится после следующей новой сводки";

  renderExecutiveDivisionTable(payload?.divisionTable, selectedExecutiveGroupId);
  renderExecutiveRegionalMap(payload?.map || {});

  const executiveLatestUpdate = latestSourceUpdate(
    payload?.outages?.sourceUpdatedAt,
    payload?.requests?.sourceUpdatedAt,
    payload?.workorders?.sourceUpdatedAt
  );
  executiveEl("executiveUpdatedAt").textContent = formatSourceUpdate(
    executiveLatestUpdate || formatDateTime(payload?.updatedAt || new Date().toISOString())
  );
}

async function loadExecutiveDashboard(options = {}) {
  const { openView = false, quiet = false } = options;

  if (!hasPanelAccess("executive-monitoring")) {
    if (!quiet) {
      showPanelAccessDenied("executive-monitoring");
    }
    return false;
  }

  try {
    const params = new URLSearchParams();
    if (selectedExecutiveGroupId) params.set("group", selectedExecutiveGroupId);
    if (selectedExecutiveUnitId) params.set("unit", selectedExecutiveUnitId);
    const query = params.toString() ? `?${params.toString()}` : "";

    const {
      response,
      payload,
      notModified
    } = await fetchJsonWithEtag(
      `${API_EXECUTIVE_MONITORING}${query}`,
      {
        method: "GET",
        credentials: "include",
        headers: getSessionHeaders()
      },
      `executive:${query}`
    );

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return false;
    }

    if (!response.ok && !notModified) {
      throw new Error(payload?.message || payload?.error || `Сервер вернул ошибку ${response.status}`);
    }

    if (openView) {
      setView("executive");
      startExecutiveRefresh();
    }

    renderExecutiveDashboard(payload);
    return true;
  } catch (error) {
    if (!quiet) {
      openModal({
        type: "denied",
        eyebrow: "ОШИБКА ДАННЫХ",
        title: "Не удалось обновить панель",
        message: error instanceof Error ? error.message : "Попробуйте ещё раз."
      });
    }
    return false;
  }
}

async function navigateExecutive() {
  if (!hasPanelAccess("executive-monitoring")) {
    showPanelAccessDenied("executive-monitoring");
    return;
  }

  await openViewWithLoading(
    "executive",
    () => loadExecutiveDashboard(),
    startExecutiveRefresh,
    "Загрузка диспетчерского мониторинга…"
  );
}

function startExecutiveRefresh() {
  stopExecutiveRefresh();
  executiveRefreshTimer = setInterval(() => {
    if (currentView === "executive" && isAppVisible()) {
      loadExecutiveDashboard({ quiet: true });
    }
  }, EXECUTIVE_REFRESH_INTERVAL_MS);
}

function stopExecutiveRefresh() {
  if (executiveRefreshTimer) {
    clearInterval(executiveRefreshTimer);
    executiveRefreshTimer = null;
  }
}

function navigateAdmin() {

  if (
    !hasPanelAccess(
      "system-control"
    )
  ) {
    showPanelAccessDenied("system-control");
    return;
  }

  setView("admin");
  stopAdminRefresh();
  loadAdminDashboard();
  // Центр управления не обновляется по таймеру: это защищает
  // незавершённые настройки от перерисовки во время редактирования.
}

function excelPreviewValue(row, field, index) {
  if (field === "pending") return "";
  if (field === "index") return index + 1;
  if (field === "disconnectedObjects") {
    return Array.isArray(row?.disconnectedObjects)
      ? row.disconnectedObjects.join(", ")
      : String(row?.disconnectedObjects || "");
  }
  return row?.[field] ?? "";
}

function renderExcelPreview(payload) {
  excelPreviewPayload = payload;
  const config = payload?.config || {};
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const columns = Array.isArray(config?.columns) ? config.columns : [];
  const previewColumnWidths = Array.isArray(payload?.layout?.columnWidths)
    ? payload.layout.columnWidths
    : [];
  const previewRowHeights = Array.isArray(payload?.layout?.rowHeights)
    ? payload.layout.rowHeights
    : [];

  excelEmergencyRowCount.textContent = Number(payload?.rowCount || 0);
  excelEmergencySourceState.textContent = payload?.source?.status === "ok"
    ? "Свежая сводка OMS"
    : (payload?.source?.message || "Источник недоступен");
  excelExportsUpdatedAt.textContent = `Обновлено: ${formatDateTime(payload?.updatedAt || new Date().toISOString())}`;
  excelPreviewTitle.textContent = config?.name || "Аварийные отключения";
  excelPreviewDocumentTitle.textContent = config?.title || "Аварийные отключения";
  excelPreviewDocumentSubtitle.textContent = config?.subtitle || "";
  excelPreviewMeta.textContent = `${Number(payload?.rowCount || 0)} строк · показано ${rows.length}`;

  excelPreviewDocumentTitle.style.color = config?.titleStyle?.color || "#ffffff";
  excelPreviewDocumentTitle.style.background = config?.titleStyle?.fill || "#12334a";
  excelPreviewDocumentTitle.style.fontSize = `${Number(config?.titleStyle?.fontSize || 16)}px`;
  excelPreviewDocumentTitle.style.textAlign = config?.titleStyle?.align || "left";

  const thead = excelPreviewTable.querySelector("thead");
  const tbody = excelPreviewTable.querySelector("tbody");
  thead.innerHTML = `<tr>${columns.map((column, columnIndex) => {
    const widthUnits = Number(previewColumnWidths[columnIndex] || column?.width || 18);
    const pixelWidth = Math.max(70, Math.round(widthUnits * 8));
    return `<th style="width:${pixelWidth}px;min-width:${pixelWidth}px;text-align:${escapeHtml(column?.align || "left")};background:${escapeHtml(config?.headerStyle?.fill || "#d6a446")};color:${escapeHtml(config?.headerStyle?.color || "#15100a")};font-size:${Number(config?.headerStyle?.fontSize || 10)}px">${escapeHtml(column?.label || "")}</th>`;
  }).join("")}</tr>`;

  tbody.innerHTML = rows.length
    ? rows.map((row, rowIndex) => {
        const rowHeightPt = Number(previewRowHeights[rowIndex] || config?.bodyStyle?.rowHeight || 24);
        const rowHeightPx = Math.max(24, Math.round(rowHeightPt * 1.333));
        return `<tr style="height:${rowHeightPx}px">${columns.map((column, columnIndex) => {
          const value = excelPreviewValue(row, column?.field, rowIndex);
          const background = rowIndex % 2
            ? (config?.bodyStyle?.alternateFill || "#f3f7f9")
            : (config?.bodyStyle?.fill || "#ffffff");
          const widthUnits = Number(previewColumnWidths[columnIndex] || column?.width || 18);
          const pixelWidth = Math.max(70, Math.round(widthUnits * 8));
          const shouldWrap = Boolean(column?.wrap || column?.autoHeight);
          return `<td style="width:${pixelWidth}px;min-width:${pixelWidth}px;text-align:${escapeHtml(column?.align || "left")};background:${escapeHtml(background)};color:${escapeHtml(config?.bodyStyle?.color || "#17212b")};font-size:${Number(column?.fontSize || config?.bodyStyle?.fontSize || 10)}px;font-weight:${column?.bold ? 700 : 400};white-space:${shouldWrap ? "normal" : "nowrap"};overflow-wrap:${shouldWrap ? "anywhere" : "normal"}">${escapeHtml(value)}</td>`;
        }).join("")}</tr>`;
      }).join("")
    : `<tr><td colspan="${Math.max(1, columns.length)}">В текущей сводке нет аварийных отключений для выбранных подразделений.</td></tr>`;

  excelPreviewState.hidden = true;
  excelPreviewSheet.hidden = false;
}

async function loadExcelPreview({ quiet = false } = {}) {
  if (!hasPanelAccess("excel-exports")) return false;
  if (!quiet) {
    excelPreviewState.hidden = false;
    excelPreviewState.textContent = "Формирование предпросмотра…";
    excelPreviewSheet.hidden = true;
    excelRefreshPreviewButton.disabled = true;
  }

  try {
    const limit = Number(excelPreviewLimit?.value || 25);
    const response = await fetch(`${API_EXCEL_EXPORTS}?type=emergency&limit=${limit}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: getSessionHeaders()
    });
    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return false;
    }
    if (response.status === 403) {
      navigateHome();
      return false;
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "Не удалось загрузить предпросмотр");
    renderExcelPreview(payload);
    return true;
  } catch (error) {
    excelPreviewState.hidden = false;
    excelPreviewSheet.hidden = true;
    excelPreviewState.textContent = error instanceof Error ? error.message : "Ошибка предпросмотра";
    return false;
  } finally {
    excelRefreshPreviewButton.disabled = false;
  }
}

function setExcelPreviewOpen(open) {
  excelPreviewOpen = Boolean(open);

  if (excelPreviewPanel) {
    excelPreviewPanel.hidden = !excelPreviewOpen;
  }

  if (excelTogglePreviewButton) {
    excelTogglePreviewButton.textContent = excelPreviewOpen
      ? "Скрыть предпросмотр"
      : "Открыть предпросмотр";
  }

  if (excelRefreshPreviewButton) {
    excelRefreshPreviewButton.hidden = !excelPreviewOpen;
  }
}

async function navigateExcelExports() {
  if (!hasPanelAccess("excel-exports")) {
    showPanelAccessDenied("excel-exports");
    return;
  }
  setView("excel-exports");
  setExcelPreviewOpen(false);
  excelPreviewPayload = null;
  if (excelEmergencyRowCount) excelEmergencyRowCount.textContent = "—";
  if (excelEmergencySourceState) excelEmergencySourceState.textContent = "Откройте предпросмотр";
  if (excelExportsUpdatedAt) excelExportsUpdatedAt.textContent = "Excel · готово к формированию";
}

async function downloadEmergencyExcel() {
  if (!hasPanelAccess("excel-exports")) return;
  excelDownloadEmergencyButton.disabled = true;
  const oldText = excelDownloadEmergencyButton.querySelector("span")?.textContent || "Скачать XLSX";
  if (excelDownloadEmergencyButton.querySelector("span")) {
    excelDownloadEmergencyButton.querySelector("span").textContent = "Формирование…";
  }
  try {
    const response = await fetch(`${API_EXCEL_EXPORTS}?type=emergency&download=1`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: getSessionHeaders()
    });
    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return;
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || "Не удалось сформировать XLSX");
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1] || "";
    const fileName = encoded ? decodeURIComponent(encoded) : "Аварийные_отключения.xlsx";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow: "EXCEL ВЫГРУЗКИ",
      title: "Не удалось скачать файл",
      message: error instanceof Error ? error.message : "Попробуйте ещё раз."
    });
  } finally {
    excelDownloadEmergencyButton.disabled = false;
    if (excelDownloadEmergencyButton.querySelector("span")) {
      excelDownloadEmergencyButton.querySelector("span").textContent = oldText;
    }
  }
}

const outagesExportButton = document.getElementById("outagesExportButton");
const outagesExportStatus = document.getElementById("outagesExportStatus");

async function downloadOutagesWorkbook() {
  if (!outagesExportButton || outagesExportButton.disabled) return;

  const label = outagesExportButton.querySelector("span");
  const oldText = label?.textContent || "Скачать Excel";
  outagesExportButton.disabled = true;
  outagesExportButton.classList.add("is-loading");
  if (label) label.textContent = "Формирование…";
  if (outagesExportStatus) {
    outagesExportStatus.classList.remove("is-error");
    outagesExportStatus.textContent = "Получаем последние сводки аварийных и плановых отключений…";
  }

  try {
    const response = await fetch(API_ADMIN_OUTAGES_EXPORT, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: getSessionHeaders()
    });

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return;
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || "Не удалось сформировать Excel");
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1] || "";
    const fileName = encoded ? decodeURIComponent(encoded) : "Отключения_аварийные_и_плановые.xlsx";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    const emergency = response.headers.get("x-outages-emergency");
    const planned = response.headers.get("x-outages-planned");
    if (outagesExportStatus) {
      outagesExportStatus.textContent = emergency !== null && planned !== null
        ? `Готово: аварийных — ${emergency}, плановых — ${planned}. ${formatDateTime(new Date().toISOString())}`
        : "Файл сформирован.";
    }
  } catch (error) {
    if (outagesExportStatus) {
      outagesExportStatus.classList.add("is-error");
      outagesExportStatus.textContent = error instanceof Error ? error.message : "Не удалось сформировать Excel";
    }
  } finally {
    outagesExportButton.disabled = false;
    outagesExportButton.classList.remove("is-loading");
    if (label) label.textContent = oldText;
  }
}

outagesExportButton?.addEventListener("click", downloadOutagesWorkbook);


/* =========================================================
   ЗАЯВКИ · отдельное окно со всеми заявками из txt-файла СК-11
   ========================================================= */
function requestsEl(id) {
  return document.getElementById(id);
}

function stopRequestsRefresh() {
  if (requestsState.refreshTimer) {
    clearInterval(requestsState.refreshTimer);
    requestsState.refreshTimer = null;
  }
}

function startRequestsRefresh() {
  stopRequestsRefresh();
  requestsState.refreshTimer = setInterval(() => {
    if (currentView === "requests" && isAppVisible()) {
      loadRequestsDetails({ quiet: true });
    }
  }, REQUESTS_REFRESH_INTERVAL_MS);
}

function requestMatchesFilter(item, filter) {
  if (filter === "all") return true;
  if (filter === "ending") return Boolean(item.ending);
  return item.statusKey === filter;
}

function requestSearchText(item) {
  if (!item._search) {
    item._search = [
      item.id,
      `№${item.id}`,
      item.status,
      item.object,
      item.equipment,
      ...(item.works || []),
      item.source,
      ...(item.alsoSources || [])
    ].join(" ").toLowerCase().replace(/ё/g, "е");
  }
  return item._search;
}

function filteredRequests() {
  const list = Array.isArray(requestsState.data?.requests) ? requestsState.data.requests : [];
  const words = requestsState.query
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/\s+/)
    .filter(Boolean);

  return list.filter((item) =>
    requestMatchesFilter(item, requestsState.filter) &&
    words.every((word) => requestSearchText(item).includes(word))
  );
}

function renderRequestCard(item, index = 0) {
  const works = Array.isArray(item.works) ? item.works : [];
  const worksLength = works.join(" ").length;
  const also = Array.isArray(item.alsoSources) ? item.alsoSources : [];
  // Всегда 4 ячейки, чтобы карточки в ряду были одной высоты.
  const times = [
    ["Начало", item.start],
    ["Конец", item.end],
    ["Открыта", item.openedAt],
    ["Закрыта", item.closedAt]
  ];

  return `
    <article class="request-card is-${escapeHtml(item.statusKey || "other")}${item.ending ? " is-ending" : ""}" style="--i:${index % REQUESTS_PAGE_SIZE}">
      <header class="request-card-head">
        <span class="request-number"><small>№</small>${escapeHtml(item.id)}</span>
        <span class="request-status">${escapeHtml(item.status || "—")}</span>
        ${item.ending ? '<span class="request-ending">⏳ заканч. в смену</span>' : ""}
      </header>

      <div class="request-object" title="${escapeHtml(item.object || "")}">${escapeHtml(item.object || "—")}</div>
      <div class="request-equipment"${item.equipment ? ` title="${escapeHtml(item.equipment)}"` : ""}>${escapeHtml(item.equipment || "—")}</div>

      <dl class="request-times">
        ${times.map(([label, value]) => `<div${value ? "" : ' class="is-empty"'}><dt>${label}</dt><dd>${escapeHtml(value || "—")}</dd></div>`).join("")}
      </dl>

      ${works.length ? `
        <div class="request-works${worksLength > 150 ? " is-collapsible is-collapsed" : ""}">
          <span class="request-label">Работы</span>
          ${works.length > 1
            ? `<ul>${works.map((work) => `<li>${escapeHtml(work)}</li>`).join("")}</ul>`
            : `<p>${escapeHtml(works[0])}</p>`}
          ${worksLength > 150 ? '<button class="request-works-toggle" type="button">Показать полностью</button>' : ""}
        </div>
      ` : '<div class="request-works is-empty"><span class="request-label">Работы</span><p>—</p></div>'}

      <footer class="request-sources">
        <span class="request-source-main" title="Основной РЭС">${escapeHtml(item.source || "—")}</span>
        ${also.length ? `<span class="request-source-also">Также: ${also.map((label) => escapeHtml(label)).join(", ")}</span>` : ""}
      </footer>
    </article>
  `;
}

function renderRequestsList() {
  const list = requestsEl("requestsList");
  const more = requestsEl("requestsMoreButton");
  const resultLine = requestsEl("requestsResultLine");
  if (!list) return;

  const items = filteredRequests();
  const visible = items.slice(0, requestsState.shown);

  if (resultLine) {
    const total = Number(requestsState.data?.requests?.length || 0);
    resultLine.textContent = items.length === total
      ? `Показано ${visible.length} из ${items.length}`
      : `Найдено ${items.length} из ${total} · показано ${visible.length}`;
  }

  list.innerHTML = visible.length
    ? visible.map(renderRequestCard).join("")
    : `<div class="requests-empty">${requestsState.data?.requests?.length ? "Нет заявок по выбранному фильтру" : "Заявок нет"}</div>`;

  // Если текст работ не поместился в фиксированный блок карточки (ПК),
  // добавляем «Показать полностью», чтобы ничего не обрезалось молча.
  list.querySelectorAll(".request-works:not(.is-collapsible):not(.is-empty)").forEach((works) => {
    const body = works.querySelector("p, ul");
    if (!body || body.scrollHeight <= body.clientHeight + 2) return;
    works.classList.add("is-collapsible", "is-collapsed");
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "request-works-toggle";
    toggle.textContent = "Показать полностью";
    works.appendChild(toggle);
  });

  if (more) {
    const rest = items.length - visible.length;
    more.hidden = rest <= 0;
    more.textContent = `Показать ещё ${Math.min(rest, REQUESTS_PAGE_SIZE)} из ${rest}`;
  }
}

function renderRequestsFilters() {
  const container = requestsEl("requestsStatusFilters");
  if (!container) return;
  const counts = requestsState.data?.counts || {};

  container.innerHTML = REQUEST_STATUS_FILTERS.map((filter) => {
    const count = filter.key === "all" ? Number(counts.total || 0) : Number(counts[filter.key] || 0);
    const active = requestsState.filter === filter.key;
    return `
      <button class="requests-filter is-${filter.key}${active ? " is-active" : ""}" type="button" role="tab" aria-selected="${active}" data-requests-filter="${filter.key}"${count || filter.key === "all" ? "" : " disabled"}>
        <i></i><span>${filter.label}</span><b>${count}</b>
      </button>
    `;
  }).join("");
}

function renderRequestsView() {
  const data = requestsState.data || {};
  requestsEl("requestsScopeTitle").textContent = `Заявки · ${data.scopeLabel || "—"}`;
  requestsEl("requestsTotal").textContent = Number(data.counts?.total || 0);
  requestsEl("requestsShiftLine").textContent = [
    data.shift ? `Смена ${String(data.shift).toLowerCase()}` : "",
    data.period || ""
  ].filter(Boolean).join(": ") || "Смена: —";
  requestsEl("requestsUpdatedAt").textContent = data.generatedAt
    ? `Сформировано: ${data.generatedAt}`
    : "Сформировано: —";

  const notice = requestsEl("requestsNotice");
  if (notice) {
    const text = data.status && data.status !== "ok" ? data.message : "";
    notice.hidden = !text;
    notice.textContent = text || "";
    notice.classList.toggle("is-warning", data.status === "stale");
  }

  renderRequestsFilters();
  renderRequestsList();
}

async function loadRequestsDetails({ quiet = false } = {}) {
  const token = ++requestsState.loadToken;
  const params = new URLSearchParams({ scope: requestsState.scope });
  if (requestsState.groupId) params.set("group", requestsState.groupId);
  if (requestsState.unitId) params.set("unit", requestsState.unitId);

  try {
    const response = await fetch(`${API_REQUESTS_DETAILS}?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: getSessionHeaders()
    });

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return false;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || `Сервер вернул ошибку ${response.status}`);
    }

    // Ответ на устаревший запрос (пользователь уже открыл другое подразделение).
    if (token !== requestsState.loadToken) return true;

    requestsState.data = payload;
    renderRequestsView();
    return true;
  } catch (error) {
    if (!quiet) {
      openModal({
        type: "denied",
        eyebrow: "ЗАЯВКИ",
        title: "Не удалось загрузить заявки",
        message: error instanceof Error ? error.message : "Попробуйте ещё раз."
      });
    }
    return false;
  }
}

async function openRequestsView(scope) {
  const isExecutive = scope === "executive";
  const panel = isExecutive ? "executive-monitoring" : "dispatcher";
  if (!hasPanelAccess(panel)) {
    showPanelAccessDenied(panel);
    return;
  }

  Object.assign(requestsState, {
    scope: isExecutive ? "executive" : "dispatcher",
    groupId: isExecutive ? selectedExecutiveGroupId : selectedDispatcherGroupId,
    unitId: isExecutive ? selectedExecutiveUnitId : selectedDispatcherUnitId,
    returnView: isExecutive ? "executive" : "dispatcher",
    data: null,
    filter: "all",
    query: "",
    shown: REQUESTS_PAGE_SIZE
  });

  const search = requestsEl("requestsSearchInput");
  if (search) search.value = "";
  const backLabel = requestsEl("requestsBackLabel");
  if (backLabel) backLabel.textContent = isExecutive ? "Диспетчерский мониторинг" : "Интерфейс диспетчера";
  requestsEl("requestsList").innerHTML = "";
  requestsEl("requestsResultLine").textContent = "";
  requestsEl("requestsMoreButton").hidden = true;

  setView("requests");
  const token = showViewLoading("Загрузка заявок…");

  try {
    const ok = await loadRequestsDetails();
    if (currentView !== "requests") return;
    if (ok) {
      startRequestsRefresh();
    } else {
      closeRequestsView();
    }
  } finally {
    hideViewLoading(token);
  }
}

function closeRequestsView() {
  stopRequestsRefresh();
  hideViewLoading();

  if (requestsState.returnView === "dispatcher" && hasPanelAccess("dispatcher")) {
    setView("dispatcher");
    startDispatcherRefresh();
    loadDispatcherDashboard({ quiet: true });
  } else if (requestsState.returnView === "executive" && hasPanelAccess("executive-monitoring")) {
    setView("executive");
    startExecutiveRefresh();
    loadExecutiveDashboard({ quiet: true });
  } else {
    navigateHome();
  }
}

document.querySelectorAll(".requests-open-panel").forEach((panel) => {
  const open = () => openRequestsView(panel.dataset.requestsScope);
  panel.addEventListener("click", open);
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
});

requestsEl("backFromRequestsButton")?.addEventListener("click", closeRequestsView);

requestsEl("requestsStatusFilters")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-requests-filter]");
  if (!button || button.disabled) return;
  requestsState.filter = button.dataset.requestsFilter;
  requestsState.shown = REQUESTS_PAGE_SIZE;
  renderRequestsFilters();
  renderRequestsList();
});

let requestsSearchTimer = null;
requestsEl("requestsSearchInput")?.addEventListener("input", (event) => {
  clearTimeout(requestsSearchTimer);
  requestsSearchTimer = setTimeout(() => {
    requestsState.query = String(event.target.value || "").trim();
    requestsState.shown = REQUESTS_PAGE_SIZE;
    renderRequestsList();
  }, 160);
});

requestsEl("requestsMoreButton")?.addEventListener("click", () => {
  requestsState.shown += REQUESTS_PAGE_SIZE;
  renderRequestsList();
});

requestsEl("requestsList")?.addEventListener("click", (event) => {
  const toggle = event.target.closest(".request-works-toggle");
  if (!toggle) return;
  const works = toggle.closest(".request-works");
  const collapsed = works.classList.toggle("is-collapsed");
  toggle.textContent = collapsed ? "Показать полностью" : "Свернуть";
});

/* =========================================================
   НДР · дашборд и список нарядов из txt-файла СК-11
   Расчёты — по методике ТЗ «Анализ НДС»: 4 группы статусов
   (+ «Прочие» из файла), % начаты = Работы начаты / Всего,
   группировка по дате планового начала, длительность допуска.
   ========================================================= */
const WO_REFRESH_INTERVAL_MS = 60000;
const WO_GROUPS = [
  { key: "notChecked", label: "Не проверен", short: "Не пров.", color: "#a78bfa" },
  { key: "checked", label: "Проверен, не начат", short: "Пров.", color: "#38bdf8" },
  { key: "started", label: "Работы начаты", short: "Начаты", color: "#22c55e" },
  { key: "notAdmitted", label: "Допуск не производился", short: "Не допущ.", color: "#f43f5e" },
  { key: "other", label: "Прочие", short: "Прочие", color: "#64748b" }
];
const WO_WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const WO_LONG_ADMISSION_MIN = 40;

function woEl(id) {
  return document.getElementById(id);
}

function woPercent(part, total) {
  return total ? (part / total) * 100 : 0;
}

function woFormatPercent(value) {
  return `${(Math.round(value * 10) / 10).toLocaleString("ru-RU")}%`;
}

// Пороги ТЗ: < 25 оранжевый, 25–39 жёлтый, ≥ 40 зелёный.
function woTone(percent) {
  if (percent >= 40) return "high";
  if (percent >= 25) return "mid";
  return "low";
}

function woParseDate(value) {
  const match = String(value || "").match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0));
  return {
    key: `${match[3]}-${match[2]}-${match[1]}`,
    label: `${match[1]}.${match[2]}`,
    full: `${match[1]}.${match[2]}.${match[3]}`,
    weekday: WO_WEEKDAYS[date.getDay()],
    time: date.getTime()
  };
}

function woEmptyCounts() {
  return { notChecked: 0, checked: 0, started: 0, notAdmitted: 0, other: 0, total: 0 };
}

function woCount(orders) {
  const counts = woEmptyCounts();
  for (const order of orders) {
    counts[order.group] = (counts[order.group] || 0) + 1;
    counts.total += 1;
  }
  return counts;
}

function woMedian(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function woAnalytics(orders) {
  const counts = woCount(orders);

  const dayMap = new Map();
  for (const order of orders) {
    const date = woParseDate(order.planStart);
    const key = date?.key || "—";
    if (!dayMap.has(key)) dayMap.set(key, { date, orders: [] });
    dayMap.get(key).orders.push(order);
  }
  const days = [...dayMap.values()]
    .sort((a, b) => (a.date?.time ?? -Infinity) - (b.date?.time ?? -Infinity))
    .map((item) => ({ ...item, counts: woCount(item.orders) }));

  const admissions = orders
    .filter((order) => Number.isFinite(order.admissionMinutes) && order.admissionMinutes >= 0)
    .sort((a, b) => b.admissionMinutes - a.admissionMinutes);
  const minutes = admissions.map((order) => order.admissionMinutes);

  return {
    counts,
    days,
    admissions,
    admissionStats: {
      count: minutes.length,
      average: minutes.length ? minutes.reduce((sum, value) => sum + value, 0) / minutes.length : null,
      median: woMedian(minutes),
      min: minutes.length ? Math.min(...minutes) : null,
      max: minutes.length ? Math.max(...minutes) : null
    },
    inShift: orders.filter((order) => order.startsInShift).length,
    longAdmissions: admissions.filter((order) => order.admissionMinutes > WO_LONG_ADMISSION_MIN).length
  };
}

function woStackBar(counts) {
  const total = counts.total || 1;
  return `<div class="wo-stack">${WO_GROUPS.map((group) => {
    const value = counts[group.key] || 0;
    return value
      ? `<i style="width:${((value / total) * 100).toFixed(2)}%;background:${group.color}" title="${group.label}: ${value}"></i>`
      : "";
  }).join("")}</div>`;
}

function renderWoKpis(analytics) {
  const { counts, admissionStats, inShift } = analytics;
  const startedPercent = woPercent(counts.started, counts.total);
  const tiles = [
    { label: "Всего нарядов", value: counts.total, hint: `${inShift} с началом в смену`, tone: "total" },
    { label: "Работы начаты", value: counts.started, hint: "допуск, подготовка, перерыв", tone: "started" },
    { label: "% начала работ", value: woFormatPercent(startedPercent), hint: "начаты / всего", tone: `percent is-${woTone(startedPercent)}` },
    { label: "Проверены, не начаты", value: counts.checked, hint: "зарегистрирован", tone: "checked" },
    { label: "Не проверены", value: counts.notChecked, hint: "создан", tone: "notChecked" },
    { label: "Допуск не производился", value: counts.notAdmitted, hint: "по статусу СК-11", tone: "notAdmitted" },
    { label: "Прочие", value: counts.other, hint: "закрыт, отменён и т. п.", tone: "other" },
    { label: "Медиана допуска", value: admissionStats.median === null ? "—" : `${Math.round(admissionStats.median)} мин`, hint: `рассчитано ${admissionStats.count} · > ${WO_LONG_ADMISSION_MIN} мин: ${analytics.longAdmissions}`, tone: "admission" }
  ];

  woEl("woKpis").innerHTML = tiles.map((tile, index) => `
    <div class="wo-kpi is-${tile.tone}" style="--i:${index}">
      <span>${tile.label}</span>
      <strong>${typeof tile.value === "number" ? tile.value.toLocaleString("ru-RU") : tile.value}</strong>
      <small>${tile.hint}</small>
    </div>
  `).join("");
}

function renderWoStatus(analytics) {
  const { counts } = analytics;
  woEl("woStatusTotal").textContent = counts.total;
  renderDispatcherDonutChart(
    woEl("woStatusChart"),
    WO_GROUPS.map((group) => ({ label: group.label, value: counts[group.key] || 0, color: group.color }))
  );
  woEl("woStatusLegend").innerHTML = WO_GROUPS.map((group) => `
    <div class="wo-legend-item">
      <i style="background:${group.color}"></i>
      <span>${group.label}</span>
      <strong>${counts[group.key] || 0}</strong>
      <small>${woFormatPercent(woPercent(counts[group.key] || 0, counts.total))}</small>
    </div>
  `).join("");
}

function renderWoDays(analytics) {
  const chart = woEl("woDaysChart");
  let days = analytics.days;

  // Длинный хвост старых дат сворачиваем в «Ранее», чтобы график читался.
  const MAX_DAYS = 8;
  if (days.length > MAX_DAYS) {
    const older = days.slice(0, days.length - (MAX_DAYS - 1));
    const orders = older.flatMap((item) => item.orders);
    days = [
      { date: { label: "Ранее", weekday: `${older.length} дн.`, full: "Ранее" }, orders, counts: woCount(orders), isOlder: true },
      ...days.slice(days.length - (MAX_DAYS - 1))
    ];
  }

  if (!days.length) {
    chart.innerHTML = '<div class="requests-empty">Нет данных</div>';
  } else {
    const maxTotal = Math.max(...days.map((item) => item.counts.total), 1);
    chart.innerHTML = `
      <div class="wo-bars">
        ${days.map((item, index) => {
          const percent = woPercent(item.counts.started, item.counts.total);
          const height = Math.max(6, (item.counts.total / maxTotal) * 100);
          return `
            <div class="wo-bar${item.isOlder ? " is-older" : ""}" style="--i:${index}" title="${escapeHtml(item.date?.full || "—")}: всего ${item.counts.total}, начаты ${item.counts.started}">
              <b class="wo-bar-value is-${woTone(percent)}">${woFormatPercent(percent)}</b>
              <div class="wo-bar-track">
                <div class="wo-bar-column" style="height:${height.toFixed(1)}%">
                  ${WO_GROUPS.map((group) => {
                    const value = item.counts[group.key] || 0;
                    return value ? `<i style="flex:${value};background:${group.color}"></i>` : "";
                  }).join("")}
                </div>
              </div>
              <span class="wo-bar-label">${escapeHtml(item.date?.label || "—")}</span>
              <small>${escapeHtml(item.date?.weekday || "")} · ${item.counts.total}</small>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  const total = analytics.counts;
  const TABLE_DAYS = 8;
  const olderDays = analytics.days.length > TABLE_DAYS ? analytics.days.slice(0, analytics.days.length - TABLE_DAYS) : [];
  const recentDays = analytics.days.slice(olderDays.length);
  const olderCounts = woCount(olderDays.flatMap((item) => item.orders));
  const dayRow = (item, extraClass = "") => {
    const percent = woPercent(item.counts.started, item.counts.total);
    return `
      <tr class="${extraClass}">
        <td><span class="wo-long">${escapeHtml(item.date?.full || "—")}</span><span class="wo-short">${escapeHtml(item.date?.label || "—")}</span></td>
        <td class="wo-col-day">${escapeHtml(item.date?.weekday || "")}</td>
        ${WO_GROUPS.map((group) => `<td>${item.counts[group.key] || 0}</td>`).join("")}
        <td><b>${item.counts.total}</b></td>
        <td><span class="wo-chip is-${woTone(percent)}">${woFormatPercent(percent)}</span></td>
      </tr>
    `;
  };
  const olderPercent = woPercent(olderCounts.started, olderCounts.total);
  woEl("woDaysTable").innerHTML = (olderDays.length ? `
    <tr class="wo-older-toggle" data-wo-older>
      <td>▸ Ранее</td>
      <td class="wo-col-day">${olderDays.length} дн.</td>
      ${WO_GROUPS.map((group) => `<td>${olderCounts[group.key] || 0}</td>`).join("")}
      <td><b>${olderCounts.total}</b></td>
      <td><span class="wo-chip is-${woTone(olderPercent)}">${woFormatPercent(olderPercent)}</span></td>
    </tr>
    ${olderDays.map((item) => dayRow(item, "wo-older-row")).join("")}
  ` : "") + recentDays.map((item) => dayRow(item)).join("") + `
    <tr class="is-total">
      <td>ИТОГО</td><td class="wo-col-day"></td>
      ${WO_GROUPS.map((group) => `<td>${total[group.key] || 0}</td>`).join("")}
      <td><b>${total.total}</b></td>
      <td><span class="wo-chip is-${woTone(woPercent(total.started, total.total))}">${woFormatPercent(woPercent(total.started, total.total))}</span></td>
    </tr>
  `;
}

const WO_BRANCH_NAMES = {
  "ВЭС": "Выборгские электрические сети",
  "ГтЭС": "Гатчинские электрические сети",
  "КнЭС": "Кингисеппские электрические сети",
  "НлЭС": "Новоладожские электрические сети",
  "СПбВС": "Санкт-Петербургские высоковольтные сети",
  "СЭС": "Северные электрические сети",
  "ТхЭС": "Тихвинские электрические сети",
  "ЮЭС": "Южные электрические сети",
  "КС": "Кабельная сеть",
  "СИиЗП": "Служба изоляции и защиты от перенапряжений",
  "ЦУС": "Центр управления сетями"
};

const WO_FUNNEL_MODES = {
  branch: { title: "Воронка по филиалам", empty: "Без филиала", key: (order) => order.branch || order.organization },
  organization: { title: "Воронка по исполнителям", empty: "Без организации", key: (order) => order.organization },
  journal: { title: "Воронка по журналам", empty: "Без журнала", key: (order) => order.journal }
};

function renderWoFunnel(orders) {
  const mode = WO_FUNNEL_MODES[workordersState.funnelMode] || WO_FUNNEL_MODES.branch;
  woEl("woFunnelTitle").textContent = mode.title;

  const map = new Map();
  for (const order of orders) {
    const name = mode.key(order) || mode.empty;
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(order);
  }

  const rows = [...map.entries()]
    .map(([name, list]) => ({ name, counts: woCount(list) }))
    .map((row) => ({ ...row, percent: woPercent(row.counts.started, row.counts.total) }))
    // ТЗ: сортировка по % начаты по возрастанию (сначала худшие); при равенстве — крупнее выше.
    .sort((a, b) => a.percent - b.percent || b.counts.total - a.counts.total);

  // Строки с 1–2 нарядами (обычно подрядчики) сворачиваем, чтобы
  // основные подразделения были наверху и не терялись.
  const SMALL_LIMIT = 2;
  const mainRows = rows.length > 6 ? rows.filter((row) => row.counts.total > SMALL_LIMIT) : rows;
  const smallRows = rows.length > 6 ? rows.filter((row) => row.counts.total <= SMALL_LIMIT) : [];
  const renderRow = (row, index) => `
        <div class="wo-funnel-row" style="--i:${Math.min(index, 20)}">
          <div class="wo-funnel-name" title="${escapeHtml(WO_BRANCH_NAMES[row.name] ? `${row.name} — ${WO_BRANCH_NAMES[row.name]}` : row.name)}">
            ${escapeHtml(row.name)}
            ${WO_BRANCH_NAMES[row.name] ? `<small>${escapeHtml(WO_BRANCH_NAMES[row.name])}</small>` : ""}
          </div>
          <div class="wo-funnel-bar">${woStackBar(row.counts)}</div>
          <div class="wo-funnel-numbers">
            ${WO_GROUPS.map((group) => `<span title="${group.label}" style="--c:${group.color}">${row.counts[group.key] || 0}</span>`).join("")}
          </div>
          <div class="wo-funnel-total">${row.counts.total}</div>
          <div class="wo-funnel-percent"><span class="wo-chip is-${woTone(row.percent)}">${woFormatPercent(row.percent)}</span></div>
        </div>
      `;
  const smallCounts = woCount(smallRows.flatMap((row) => map.get(row.name)));

  woEl("woFunnel").innerHTML = rows.length
    ? `
      <div class="wo-funnel-legend">${WO_GROUPS.map((group) => `<span><i style="background:${group.color}"></i>${group.short}</span>`).join("")}</div>
      ${mainRows.map(renderRow).join("")}
      ${smallRows.length ? `
        <details class="wo-funnel-small">
          <summary>
            <span>Небольшие (до ${SMALL_LIMIT} нарядов): ${smallRows.length} шт.</span>
            <b>${smallCounts.total} нарядов · начаты ${smallCounts.started}</b>
          </summary>
          ${smallRows.map(renderRow).join("")}
        </details>
      ` : ""}
    `
    : '<div class="requests-empty">Нет данных</div>';
}

function renderWoAdmission(analytics) {
  const { admissionStats: stats, admissions } = analytics;
  const format = (value) => (value === null ? "—" : `${Math.round(value * 10) / 10}`);
  woEl("woAdmissionStats").innerHTML = [
    ["Рассчитано", stats.count, ""],
    ["Медиана", format(stats.median), "мин"],
    ["Среднее", format(stats.average), "мин"],
    ["Мин", format(stats.min), "мин"],
    ["Макс", format(stats.max), "мин"]
  ].map(([label, value, unit]) => `
    <div class="wo-stat"><span>${label}</span><strong>${value}<small>${unit}</small></strong></div>
  `).join("");

  // «Долгий» допуск — строго больше WO_LONG_ADMISSION_MIN минут.
  const LONG = WO_LONG_ADMISSION_MIN;
  const buckets = [
    { label: "0–10", test: (m) => m < 10 },
    { label: "10–20", test: (m) => m >= 10 && m < 20 },
    { label: "20–30", test: (m) => m >= 20 && m < 30 },
    { label: `30–${LONG}`, test: (m) => m >= 30 && m <= LONG },
    { label: `${LONG}–60`, test: (m) => m > LONG && m < 60, long: true },
    { label: "60+", test: (m) => m >= 60, long: true }
  ].map((bucket) => ({
    ...bucket,
    count: admissions.filter((order) => bucket.test(order.admissionMinutes)).length
  }));
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

  woEl("woAdmissionHist").innerHTML = `
    <div class="wo-hist-bars">
      ${buckets.map((bucket, index) => `
        <div class="wo-hist-bar${bucket.long ? " is-long" : ""}" style="--i:${index}">
          <b>${bucket.count}</b>
          <div class="wo-hist-track"><i style="height:${Math.max(bucket.count ? 4 : 0, (bucket.count / maxCount) * 100).toFixed(1)}%"></i></div>
          <span>${bucket.label}</span>
        </div>
      `).join("")}
    </div>
    <small class="wo-hist-caption">минут от проверки р.м. (или допуска) до фактического начала работ</small>
  `;

  const top = admissions.slice(0, 8);
  woEl("woAdmissionTop").innerHTML = top.length
    ? top.map((order) => `
        <div class="wo-top-row${order.admissionMinutes > WO_LONG_ADMISSION_MIN ? " is-long" : ""}"${order.uid ? ` data-wo-history="${escapeHtml(order.uid)}" role="button" tabindex="0" title="История наряда"` : ""}>
          <div>
            <strong>${order.number ? `№${escapeHtml(order.number)}` : "Без номера"}</strong>
            <span>${escapeHtml(order.organization || "—")} · ${escapeHtml(order.status || "")}</span>
            <small>${escapeHtml(order.object || "")}</small>
          </div>
          <div class="wo-top-times">
            <span>${escapeHtml(order.checkedAt ? `Проверка ${order.checkedAt}` : `Допуск ${order.admittedAt || "—"}`)}</span>
            <span>Факт ${escapeHtml(order.actualStartAt || "—")}</span>
          </div>
          <b>${order.admissionMinutes}<small>мин</small></b>
        </div>
      `).join("")
    : '<div class="requests-empty">Нет рассчитанных допусков</div>';
}

/* ---------- список нарядов ---------- */
const WO_FILTERS = [
  { key: "all", label: "Все", color: "#d6a446" },
  ...WO_GROUPS.map((group) => ({ key: group.key, label: group.label, color: group.color })),
  { key: "inShift", label: "Начало в смену", color: "#45c8f4" },
  { key: "longAdmission", label: `Допуск > ${WO_LONG_ADMISSION_MIN} мин`, color: "#f59e0b" }
];

function woMatchesFilter(order, filter) {
  if (filter === "all") return true;
  if (filter === "inShift") return Boolean(order.startsInShift);
  if (filter === "longAdmission") return Number(order.admissionMinutes) > WO_LONG_ADMISSION_MIN;
  return order.group === filter;
}

function woSearchText(order) {
  if (!order._search) {
    order._search = [
      order.number, order.status, order.groupLabel, order.organization, order.organizationCode, order.branch, order.journal,
      order.object, order.places, order.works, order.issuer, order.responsible,
      order.producer, ...(order.brigade || []), order.stageBy, order.uid
    ].join(" ").toLowerCase().replace(/ё/g, "е");
  }
  return order._search;
}

function woFilteredOrders() {
  const orders = Array.isArray(workordersState.data?.orders) ? workordersState.data.orders : [];
  const words = workordersState.query.toLowerCase().replace(/ё/g, "е").split(/\s+/).filter(Boolean);
  return orders.filter((order) =>
    woMatchesFilter(order, workordersState.filter) &&
    words.every((word) => woSearchText(order).includes(word))
  );
}

function renderWoCard(order, index) {
  const group = WO_GROUPS.find((item) => item.key === order.group) || WO_GROUPS[4];
  const longAdmission = Number(order.admissionMinutes) > WO_LONG_ADMISSION_MIN;
  const times = [
    ["План начало", order.planStart],
    ["План конец", order.planEnd],
    ["Выдан", order.issuedAt],
    ["Проверка р.м.", order.checkedAt],
    ["Допуск", order.admittedAt],
    ["Факт. начало", order.actualStartAt]
  ];
  const people = [
    ["Выдающий", order.issuer],
    ["Отв. руководитель", order.responsible],
    ["Производитель", order.producer],
    [`Бригада${order.brigadeCount ? ` (${order.brigadeCount})` : ""}`, (order.brigade || []).join(", ")]
  ];
  const extra = [
    ["Бригада полностью", (order.brigade || []).length > 2 ? order.brigade.join(", ") : ""],
    ["Текущий этап с", [order.stageSince, order.stageBy].filter(Boolean).join(" · ")],
    ["Подготовка р.м.", order.preparation],
    ["Результат", order.result],
    ["Доп. указания", order.notes],
    ["Прочие даты", order.otherDates],
    ["UID", order.uid]
  ].filter(([, value]) => value);

  return `
    <article class="request-card wo-card is-${order.group}" style="--chip:${group.color};--i:${index % WO_PAGE_SIZE}">
      <header class="request-card-head">
        <span class="request-number">${order.number ? `<small>№</small>${escapeHtml(order.number)}` : '<small>№</small>—'}</span>
        <span class="request-status">${escapeHtml(order.status || "—")}</span>
        <span class="wo-group-chip">${group.label}</span>
        ${order.uid ? `<button class="wo-history-button" type="button" data-wo-history="${escapeHtml(order.uid)}" title="Как менялся наряд">История</button>` : ""}
      </header>

      <div class="wo-card-meta" title="${escapeHtml(order.journal || "")}">
        <b>${escapeHtml(order.organization || "—")}</b>${order.journal ? ` · ${escapeHtml(order.journal)}` : ""}
      </div>

      <div class="request-object" title="${escapeHtml(order.object || "")}">${escapeHtml(order.object || "—")}</div>
      <div class="request-equipment"${order.places ? ` title="${escapeHtml(order.places)}"` : ""}>${escapeHtml(order.places || "Места: —")}</div>

      <div class="wo-badges">
        ${order.startsInShift ? '<span class="wo-badge is-shift">Начало в смену</span>' : ""}
        ${order.admissionMinutes !== null && order.admissionMinutes !== undefined ? `<span class="wo-badge${longAdmission ? " is-long" : ""}">${longAdmission ? "⚠ " : ""}Допуск → начало ${order.admissionMinutes} мин</span>` : ""}
      </div>

      <dl class="request-times wo-times">
        ${times.map(([label, value]) => `<div${value ? "" : ' class="is-empty"'}><dt>${label}</dt><dd>${escapeHtml(value || "—")}</dd></div>`).join("")}
      </dl>

      <div class="request-works${String(order.works || "").length > 150 ? " is-collapsible is-collapsed" : ""}">
        <span class="request-label">Работы</span>
        <p>${escapeHtml(order.works || "—")}</p>
        ${String(order.works || "").length > 150 ? '<button class="request-works-toggle" type="button">Показать полностью</button>' : ""}
      </div>

      <dl class="wo-people">
        ${people.map(([label, value]) => `<div${value ? "" : ' class="is-empty"'}><dt>${label}</dt><dd title="${escapeHtml(value || "")}">${escapeHtml(value || "—")}</dd></div>`).join("")}
      </dl>

      ${extra.length ? `
        <details class="wo-more">
          <summary>Подробнее</summary>
          <dl>${extra.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
        </details>
      ` : ""}
    </article>
  `;
}

function renderWoFilters() {
  const orders = Array.isArray(workordersState.data?.orders) ? workordersState.data.orders : [];
  woEl("woFilters").innerHTML = WO_FILTERS.map((filter) => {
    const count = orders.filter((order) => woMatchesFilter(order, filter.key)).length;
    const active = workordersState.filter === filter.key;
    return `
      <button class="requests-filter${active ? " is-active" : ""}" style="--chip:${filter.color}" type="button" role="tab" aria-selected="${active}" data-wo-filter="${filter.key}"${count || filter.key === "all" ? "" : " disabled"}>
        <i></i><span>${filter.label}</span><b>${count}</b>
      </button>
    `;
  }).join("");
}

function renderWoCards() {
  const items = woFilteredOrders();
  const visible = items.slice(0, workordersState.shown);
  const total = Number(workordersState.data?.orders?.length || 0);
  const cards = woEl("woCards");

  woEl("woResultLine").textContent = items.length === total
    ? `Показано ${visible.length} из ${items.length}`
    : `Найдено ${items.length} из ${total} · показано ${visible.length}`;

  cards.innerHTML = visible.length
    ? visible.map(renderWoCard).join("")
    : `<div class="requests-empty">${total ? "Нет нарядов по выбранному фильтру" : "Нарядов нет"}</div>`;

  const more = woEl("woMoreButton");
  const rest = items.length - visible.length;
  more.hidden = rest <= 0;
  more.textContent = `Показать ещё ${Math.min(rest, WO_PAGE_SIZE)} из ${rest}`;
}

function renderWoTabs() {
  const isList = workordersState.tab === "list";
  woEl("woDashboard").hidden = isList;
  woEl("woList").hidden = !isList;
  document.querySelectorAll("[data-wo-tab]").forEach((button) => {
    const active = button.dataset.woTab === workordersState.tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function renderWorkordersView() {
  const data = workordersState.data || {};
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const analytics = woAnalytics(orders);
  const percent = woPercent(analytics.counts.started, analytics.counts.total);

  woEl("woScopeTitle").textContent = `НДР · ${data.scopeLabel || "—"}`;
  const banner = woEl("woArchiveBanner");
  banner.hidden = !data.isArchive;
  if (data.isArchive) {
    woEl("woArchiveBannerText").textContent =
      `Архив: сводка от ${data.generatedAt || "—"} · данные на тот момент, не обновляются`;
  }
  workordersView.classList.toggle("is-archive", Boolean(data.isArchive));
  woEl("woShiftLine").textContent = [
    data.shift ? `Смена ${String(data.shift).toLowerCase()}` : "",
    data.period || ""
  ].filter(Boolean).join(": ") || "Смена: —";
  woEl("woUpdatedAt").textContent = data.generatedAt ? `Сформировано: ${data.generatedAt}` : "Сформировано: —";
  woEl("woListCount").textContent = orders.length;

  const gauge = woEl("woGaugeValue");
  const circumference = 2 * Math.PI * 50;
  gauge.style.strokeDasharray = `${circumference}`;
  gauge.style.strokeDashoffset = `${circumference * (1 - Math.min(percent, 100) / 100)}`;
  gauge.setAttribute("class", `wo-gauge-value is-${woTone(percent)}`);
  woEl("woGaugePercent").textContent = woFormatPercent(percent);

  const notice = woEl("woNotice");
  const text = data.status && data.status !== "ok" ? data.message : "";
  notice.hidden = !text;
  notice.textContent = text || "";
  notice.classList.toggle("is-warning", data.status === "stale");

  renderWoKpis(analytics);
  renderWoStatus(analytics);
  renderWoDays(analytics);
  renderWoFunnel(orders);
  renderWoAdmission(analytics);
  renderWoFilters();
  renderWoCards();
  renderWoTabs();
}

function woScopeParams() {
  const params = new URLSearchParams({ scope: workordersState.scope });
  if (workordersState.groupId) params.set("group", workordersState.groupId);
  if (workordersState.unitId) params.set("unit", workordersState.unitId);
  return params;
}

function stopWorkordersRefresh() {
  if (workordersState.refreshTimer) {
    clearInterval(workordersState.refreshTimer);
    workordersState.refreshTimer = null;
  }
}

function startWorkordersRefresh() {
  stopWorkordersRefresh();
  workordersState.refreshTimer = setInterval(() => {
    // Архивная сводка не меняется — обновляем только текущую.
    if (currentView === "workorders" && isAppVisible() && !workordersState.snapshotId) {
      loadWorkordersDetails({ quiet: true });
    }
  }, WO_REFRESH_INTERVAL_MS);
}

async function loadWorkordersDetails({ quiet = false } = {}) {
  const token = ++workordersState.loadToken;
  const params = woScopeParams();
  if (workordersState.snapshotId) params.set("snapshot", workordersState.snapshotId);

  try {
    const response = await fetch(`${API_WORKORDERS_DETAILS}?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: getSessionHeaders()
    });

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return false;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || `Сервер вернул ошибку ${response.status}`);
    }

    if (token !== workordersState.loadToken) return true;

    workordersState.data = payload;
    renderWorkordersView();
    return true;
  } catch (error) {
    if (!quiet) {
      openModal({
        type: "denied",
        eyebrow: "НДР",
        title: "Не удалось загрузить наряды",
        message: error instanceof Error ? error.message : "Попробуйте ещё раз."
      });
    }
    return false;
  }
}

async function openWorkordersView(scope) {
  const isExecutive = scope === "executive";
  const panel = isExecutive ? "executive-monitoring" : "dispatcher";
  if (!hasPanelAccess(panel)) {
    showPanelAccessDenied(panel);
    return;
  }

  Object.assign(workordersState, {
    scope: isExecutive ? "executive" : "dispatcher",
    groupId: isExecutive ? selectedExecutiveGroupId : selectedDispatcherGroupId,
    unitId: isExecutive ? selectedExecutiveUnitId : selectedDispatcherUnitId,
    returnView: isExecutive ? "executive" : "dispatcher",
    data: null,
    tab: "dashboard",
    filter: "all",
    query: "",
    shown: WO_PAGE_SIZE,
    snapshotId: "",
    snapshots: []
  });

  woEl("woSearchInput").value = "";
  renderWoSnapshotSelect();
  loadWoSnapshots();
  woEl("woBackLabel").textContent = isExecutive ? "Диспетчерский мониторинг" : "Интерфейс диспетчера";
  renderWoTabs();

  setView("workorders");
  const token = showViewLoading("Загрузка НДР…");

  try {
    const ok = await loadWorkordersDetails();
    if (currentView !== "workorders") return;
    if (ok) {
      startWorkordersRefresh();
    } else {
      closeWorkordersView();
    }
  } finally {
    hideViewLoading(token);
  }
}

function closeWorkordersView() {
  stopWorkordersRefresh();
  hideViewLoading();

  if (workordersState.returnView === "dispatcher" && hasPanelAccess("dispatcher")) {
    setView("dispatcher");
    startDispatcherRefresh();
    loadDispatcherDashboard({ quiet: true });
  } else if (workordersState.returnView === "executive" && hasPanelAccess("executive-monitoring")) {
    setView("executive");
    startExecutiveRefresh();
    loadExecutiveDashboard({ quiet: true });
  } else {
    navigateHome();
  }
}

document.querySelectorAll(".workorders-open-panel").forEach((panel) => {
  const open = () => openWorkordersView(panel.dataset.workordersScope);
  panel.addEventListener("click", open);
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
});

woEl("backFromWorkordersButton")?.addEventListener("click", closeWorkordersView);

woEl("woDaysTable")?.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-wo-older]");
  if (!toggle) return;
  const table = woEl("woDaysTable");
  const open = table.classList.toggle("is-older-open");
  toggle.firstElementChild.textContent = open ? "▾ Ранее" : "▸ Ранее";
});

document.querySelectorAll("[data-wo-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    workordersState.tab = button.dataset.woTab;
    renderWoTabs();
  });
});

document.querySelectorAll("[data-wo-funnel]").forEach((button) => {
  button.addEventListener("click", () => {
    workordersState.funnelMode = button.dataset.woFunnel;
    document.querySelectorAll("[data-wo-funnel]").forEach((item) =>
      item.classList.toggle("is-active", item === button)
    );
    renderWoFunnel(Array.isArray(workordersState.data?.orders) ? workordersState.data.orders : []);
  });
});

woEl("woFilters")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-wo-filter]");
  if (!button || button.disabled) return;
  workordersState.filter = button.dataset.woFilter;
  workordersState.shown = WO_PAGE_SIZE;
  renderWoFilters();
  renderWoCards();
});

let woSearchTimer = null;
woEl("woSearchInput")?.addEventListener("input", (event) => {
  clearTimeout(woSearchTimer);
  woSearchTimer = setTimeout(() => {
    workordersState.query = String(event.target.value || "").trim();
    workordersState.shown = WO_PAGE_SIZE;
    renderWoCards();
  }, 160);
});

woEl("woMoreButton")?.addEventListener("click", () => {
  workordersState.shown += WO_PAGE_SIZE;
  renderWoCards();
});

woEl("woCards")?.addEventListener("click", (event) => {
  const toggle = event.target.closest(".request-works-toggle");
  if (!toggle) return;
  const works = toggle.closest(".request-works");
  const collapsed = works.classList.toggle("is-collapsed");
  toggle.textContent = collapsed ? "Показать полностью" : "Свернуть";
});

/* ---------- архив НДР: выбор сводки ---------- */
function woFormatTs(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderWoSnapshotSelect() {
  const select = woEl("woSnapshotSelect");
  if (!select) return;
  const list = workordersState.snapshots || [];

  // Группируем по дате сводки.
  const groups = new Map();
  for (const item of list) {
    const label = String(item.generatedAt || woFormatTs(item.ts)).split(/\s+/)[0] || "—";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  }

  select.innerHTML = `
    <option value="">Текущая (онлайн)</option>
    ${[...groups.entries()].map(([date, items]) => `
      <optgroup label="${escapeHtml(date)}">
        ${items.map((item) => {
          const time = String(item.generatedAt || woFormatTs(item.ts)).split(/\s+/)[1] || "";
          const percent = item.total ? Math.round((item.started / item.total) * 1000) / 10 : 0;
          const shift = item.shift ? ` · ${String(item.shift).toLowerCase()}` : "";
          return `<option value="${escapeHtml(item.id)}">${escapeHtml(time)}${escapeHtml(shift)} · ${item.total} НДР · начаты ${percent}%</option>`;
        }).join("")}
      </optgroup>
    `).join("")}
  `;
  select.value = workordersState.snapshotId || "";
  select.disabled = !list.length;
  document.querySelectorAll("[data-wo-jump]").forEach((button) => {
    const days = Number(button.dataset.woJump);
    button.disabled = days > 0 && !list.length;
    button.classList.toggle("is-active", days === 0 ? !workordersState.snapshotId : false);
  });
}

async function loadWoSnapshots() {
  try {
    const response = await fetch(`${API_WORKORDERS_HISTORY}?${woScopeParams().toString()}&list=1`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: getSessionHeaders()
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    workordersState.snapshots = Array.isArray(payload?.snapshots) ? payload.snapshots : [];
  } catch {
    workordersState.snapshots = [];
  }
  renderWoSnapshotSelect();
}

async function selectWoSnapshot(id) {
  workordersState.snapshotId = id || "";
  workordersState.shown = WO_PAGE_SIZE;
  renderWoSnapshotSelect();
  const token = showViewLoading(id ? "Загрузка архивной сводки…" : "Загрузка НДР…");
  try {
    const ok = await loadWorkordersDetails();
    if (!ok && id) {
      workordersState.snapshotId = "";
      renderWoSnapshotSelect();
    }
  } finally {
    hideViewLoading(token);
  }
}

// Ближайшая сводка к моменту «N суток назад».
function woSnapshotDaysAgo(days) {
  const list = workordersState.snapshots || [];
  if (!days || !list.length) return "";
  const target = Date.now() - days * 24 * 60 * 60 * 1000;
  let best = null;
  for (const item of list) {
    if (!best || Math.abs(item.ts - target) < Math.abs(best.ts - target)) best = item;
  }
  return best?.id || "";
}

woEl("woSnapshotSelect")?.addEventListener("change", (event) => {
  selectWoSnapshot(event.target.value);
});

document.querySelectorAll("[data-wo-jump]").forEach((button) => {
  button.addEventListener("click", () => {
    const days = Number(button.dataset.woJump);
    selectWoSnapshot(days ? woSnapshotDaysAgo(days) : "");
  });
});

woEl("woArchiveBackButton")?.addEventListener("click", () => selectWoSnapshot(""));

/* ---------- архив НДР: жизнь наряда ---------- */
const WO_HISTORY_FIELDS = [
  ["number", "Номер"],
  ["status", "Статус"],
  ["groupLabel", "Группа"],
  ["organization", "Исполнитель"],
  ["branch", "Филиал"],
  ["journal", "Журнал"],
  ["object", "Объект"],
  ["places", "Места"],
  ["works", "Работы"],
  ["planStart", "План начало"],
  ["planEnd", "План конец"],
  ["issuedAt", "Выдан"],
  ["checkedAt", "Проверка р.м."],
  ["admittedAt", "Допуск"],
  ["actualStartAt", "Факт. начало"],
  ["admissionMinutes", "Допуск → начало, мин"],
  ["stageSince", "Текущий этап с"],
  ["stageBy", "Этап — кто"],
  ["issuer", "Выдающий"],
  ["responsible", "Отв. руководитель"],
  ["producer", "Производитель работ"],
  ["brigade", "Бригада"],
  ["preparation", "Подготовка р.м."],
  ["result", "Результат"],
  ["notes", "Доп. указания"],
  ["otherDates", "Прочие даты"],
  ["uid", "UID"]
];

function woHistoryValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function openWoHistoryModal() {
  const modal = woEl("woHistoryModal");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeWoHistoryModal() {
  const modal = woEl("woHistoryModal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function renderWoHistory(history) {
  const events = Array.isArray(history?.events) ? history.events : [];
  const versions = events.filter((event) => event.type === "version");
  const last = [...versions].reverse().find((event) => event.state)?.state || {};

  woEl("woHistoryTitle").textContent = history.number ? `Наряд №${history.number}` : "Наряд без номера";
  woEl("woHistorySubtitle").innerHTML = `
    ${escapeHtml(last.object || "—")}<br>
    <span>${escapeHtml(last.organization || "")}${last.journal ? ` · ${escapeHtml(last.journal)}` : ""}</span>
    <span class="wo-history-meta">
      <b>${versions.length}</b> ${versions.length === 1 ? "состояние" : versions.length < 5 ? "состояния" : "состояний"} ·
      ${history.inLatestSnapshot ? "есть в текущей выгрузке" : "в текущей выгрузке нет"} ·
      UID ${escapeHtml(history.uid || "")}
    </span>
  `;

  let wasGone = false;
  woEl("woHistoryBody").innerHTML = `
    <ol class="wo-timeline">
      ${events.map((event, index) => {
        const when = event.generatedAt || woFormatTs(event.ts);
        if (event.type === "gone") {
          wasGone = true;
          return `
            <li class="wo-tl-item is-gone">
              <div class="wo-tl-dot"></div>
              <div class="wo-tl-content">
                <div class="wo-tl-head"><b>${escapeHtml(when)}</b><span class="wo-tl-tag">Пропал из выгрузки</span></div>
                <p class="wo-tl-note">Наряд больше не попадает в сводку СК-11 (закрыт, отменён или вне периода смены).</p>
              </div>
            </li>
          `;
        }

        const state = event.state || {};
        const tag = event.first ? (wasGone ? "Снова в выгрузке" : "Появился в выгрузке") : "Изменение";
        wasGone = false;
        const group = WO_GROUPS.find((item) => item.key === state.group) || WO_GROUPS[4];

        return `
          <li class="wo-tl-item${event.first ? " is-first" : ""}${event.longAdmission ? " is-long" : ""}" style="--chip:${group.color};--i:${Math.min(index, 20)}">
            <div class="wo-tl-dot"></div>
            <div class="wo-tl-content">
              <div class="wo-tl-head">
                <b>${escapeHtml(when)}</b>
                <span class="wo-tl-tag">${tag}</span>
                <span class="request-status">${escapeHtml(state.status || "—")}</span>
                <span class="wo-group-chip">${escapeHtml(group.label)}</span>
              </div>
              ${event.longAdmission ? `<div class="wo-tl-alert">⚠ Между допуском и началом работ ${escapeHtml(String(state.admissionMinutes))} мин — больше ${WO_LONG_ADMISSION_MIN} мин</div>` : ""}
              ${event.changes?.length ? `
                <ul class="wo-tl-changes">
                  ${event.changes.map((change) => `
                    <li>
                      <span>${escapeHtml(change.label)}</span>
                      <s>${escapeHtml(change.from || "—")}</s>
                      <b>${escapeHtml(change.to || "—")}</b>
                    </li>
                  `).join("")}
                </ul>
              ` : event.first ? "" : '<p class="wo-tl-note">Без изменений в отслеживаемых полях.</p>'}
              <details class="wo-more">
                <summary>Все поля на этот момент</summary>
                <dl>${WO_HISTORY_FIELDS.map(([key, label]) => `<div><dt>${label}</dt><dd>${escapeHtml(woHistoryValue(state[key]))}</dd></div>`).join("")}</dl>
              </details>
            </div>
          </li>
        `;
      }).join("")}
    </ol>
  `;
}

async function showWoHistory(uid) {
  woEl("woHistoryTitle").textContent = "История наряда";
  woEl("woHistorySubtitle").textContent = "";
  woEl("woHistoryBody").innerHTML = '<div class="requests-empty">Загрузка истории…</div>';
  openWoHistoryModal();

  try {
    const params = woScopeParams();
    params.set("uid", uid);
    const response = await fetch(`${API_WORKORDERS_HISTORY}?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: getSessionHeaders()
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    renderWoHistory(payload);
  } catch (error) {
    woEl("woHistoryBody").innerHTML = `<div class="requests-empty">${escapeHtml(error instanceof Error ? error.message : "Не удалось загрузить историю")}</div>`;
  }
}

woEl("woCards")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-wo-history]");
  if (!button) return;
  event.stopPropagation();
  showWoHistory(button.dataset.woHistory);
});

woEl("woAdmissionTop")?.addEventListener("click", (event) => {
  const row = event.target.closest("[data-wo-history]");
  if (row) showWoHistory(row.dataset.woHistory);
});

woEl("woHistoryClose")?.addEventListener("click", closeWoHistoryModal);
woEl("woHistoryModal")?.addEventListener("click", (event) => {
  if (event.target === woEl("woHistoryModal")) closeWoHistoryModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && woEl("woHistoryModal")?.classList.contains("is-open")) {
    closeWoHistoryModal();
  }
});

function markExcelTemplateDirty() {
  if (excelTemplateDirty) return;
  excelTemplateDirty = true;
  if (excelTemplateStatus) {
    excelTemplateStatus.textContent = "Есть несохранённые изменения. Автообновление не перезапишет их.";
    excelTemplateStatus.classList.add("is-warning");
  }
}

function excelColumnFieldOptions(selected) {
  const sourceOptions = Array.isArray(excelTemplateCatalog.fieldOptions)
    ? [...excelTemplateCatalog.fieldOptions]
    : [];

  if (!sourceOptions.some((field) => field?.id === "pending")) {
    sourceOptions.unshift({
      id: "pending",
      name: "Пока не указан",
      type: "text"
    });
  }

  return sourceOptions.map((field) =>
    `<option value="${escapeHtml(field.id)}" ${field.id === selected ? "selected" : ""}>${escapeHtml(field.name)}</option>`
  ).join("");
}

function renderExcelTemplateColumns() {
  const columns = Array.isArray(excelTemplateCatalog.config?.columns)
    ? excelTemplateCatalog.config.columns
    : [];
  excelTemplateColumns.innerHTML = columns.length
    ? columns.map((column, index) => `
      <div class="excel-template-column" data-excel-column-index="${index}">
        <div class="excel-column-order">${index + 1}</div>
        <label class="excel-col-field"><span>Источник</span><select data-excel-col="field">${excelColumnFieldOptions(column.field)}</select></label>
        <label class="excel-col-label"><span>Заголовок</span><input data-excel-col="label" type="text" maxlength="80" value="${escapeHtml(column.label || "")}" /></label>
        <label><span>Ширина</span><input data-excel-col="width" type="number" min="6" max="60" value="${Number(column.width || 18)}" ${column.autoWidth ? "disabled" : ""}/></label>
        <label><span>Шрифт</span><input data-excel-col="fontSize" type="number" min="7" max="20" value="${Number(column.fontSize || 10)}" /></label>
        <label><span>Выравнивание</span><select data-excel-col="align"><option value="left" ${column.align === "left" ? "selected" : ""}>Слева</option><option value="center" ${column.align === "center" ? "selected" : ""}>Центр</option><option value="right" ${column.align === "right" ? "selected" : ""}>Справа</option></select></label>
        <div class="excel-col-flags">
          <label class="excel-col-check"><input data-excel-col="bold" type="checkbox" ${column.bold ? "checked" : ""}/> Жирный</label>
          <label class="excel-col-check"><input data-excel-col="wrap" type="checkbox" ${column.wrap ? "checked" : ""}/> Перенос</label>
          <label class="excel-col-check"><input data-excel-col="autoWidth" type="checkbox" ${column.autoWidth ? "checked" : ""}/> Автоширина</label>
          <label class="excel-col-check"><input data-excel-col="autoHeight" type="checkbox" ${column.autoHeight ? "checked" : ""}/> Автовысота</label>
        </div>
        <div class="excel-column-actions"><button type="button" data-excel-column-action="up" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-excel-column-action="down" ${index === columns.length - 1 ? "disabled" : ""}>↓</button><button type="button" data-excel-column-action="remove" class="is-danger">×</button></div>
      </div>`).join("")
    : `<div class="dispatcher-config-empty">Добавьте хотя бы один столбец.</div>`;
}

function renderExcelTemplateAdmin() {
  const config = excelTemplateCatalog.config;
  if (!config) return;
  excelTemplateTitle.value = config.title || "";
  excelTemplateSubtitle.value = config.subtitle || "";
  excelTemplateSheetName.value = config.sheetName || "";
  excelTemplateFileName.value = config.fileName || "";
  excelTemplateStartRow.value = Number(config.tableStartRow || 5);
  excelTemplateGeneratedAt.checked = Boolean(config.showGeneratedAt);
  excelTemplateSourceAt.checked = Boolean(config.showSourceUpdatedAt);
  excelTemplateFreeze.checked = Boolean(config.freezeHeader);
  excelTemplateFilter.checked = Boolean(config.autoFilter);
  excelTitleFontSize.value = Number(config.titleStyle?.fontSize || 16);
  excelTitleRowHeight.value = Number(config.titleStyle?.rowHeight || 28);
  excelTitleColor.value = config.titleStyle?.color || "#ffffff";
  excelTitleFill.value = config.titleStyle?.fill || "#12334a";
  excelHeaderFontSize.value = Number(config.headerStyle?.fontSize || 10);
  excelHeaderRowHeight.value = Number(config.headerStyle?.rowHeight || 24);
  excelHeaderColor.value = config.headerStyle?.color || "#15100a";
  excelHeaderFill.value = config.headerStyle?.fill || "#d6a446";
  excelBodyFontSize.value = Number(config.bodyStyle?.fontSize || 10);
  excelBodyRowHeight.value = Number(config.bodyStyle?.rowHeight || 24);
  excelBodyColor.value = config.bodyStyle?.color || "#17212b";
  excelBodyFill.value = config.bodyStyle?.fill || "#ffffff";
  excelBodyAltFill.value = config.bodyStyle?.alternateFill || "#f3f7f9";

  const selected = new Set(config.includeDivisionIds || []);
  excelTemplateDivisionPicker.innerHTML = (excelTemplateCatalog.divisions || []).map((division) => `
    <label class="permission-option"><input type="checkbox" data-excel-division value="${escapeHtml(division.id)}" ${selected.has(division.id) ? "checked" : ""}/><span><strong>${escapeHtml(division.name)}</strong><small>${Number(division.sources?.length || 0)} ролей / источников</small></span></label>`).join("") || `<div class="dispatcher-config-empty">Подразделения активных отключений не настроены.</div>`;

  renderExcelTemplateColumns();
  excelTemplateStatus.textContent = excelTemplateCatalog.storageConfigured
    ? `Шаблон готов · ${config.columns?.length || 0} столбцов`
    : "Redis не подключён: используется стандартный шаблон, сохранение недоступно.";
  excelTemplateStatus.classList.toggle("is-warning", !excelTemplateCatalog.storageConfigured);
}

async function loadExcelTemplateAdmin({ force = false } = {}) {
  if (!currentUser?.isDeveloper || !excelExportManagementPanel) return;
  if (excelTemplateDirty && !force) return;
  try {
    const response = await fetch(API_ADMIN_EXCEL_EXPORT_CONFIG, {
      method: "GET", cache: "no-store", credentials: "include", headers: getSessionHeaders()
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "Не удалось загрузить Excel шаблон");
    excelTemplateCatalog = {
      config: payload?.config || null,
      divisions: Array.isArray(payload?.divisions) ? payload.divisions : [],
      fieldOptions: Array.isArray(payload?.fieldOptions) ? payload.fieldOptions : [],
      storageConfigured: Boolean(payload?.storageConfigured)
    };
    excelTemplateDirty = false;
    renderExcelTemplateAdmin();
  } catch (error) {
    excelTemplateStatus.textContent = error instanceof Error ? error.message : "Ошибка загрузки шаблона";
    excelTemplateStatus.classList.add("is-warning");
  }
}

function syncExcelColumnDraftFromDom() {
  const columns = Array.isArray(excelTemplateCatalog.config?.columns)
    ? excelTemplateCatalog.config.columns
    : [];
  excelTemplateColumns.querySelectorAll("[data-excel-column-index]").forEach((row) => {
    const index = Number(row.dataset.excelColumnIndex);
    const column = columns[index];
    if (!column) return;
    const get = (key) => row.querySelector(`[data-excel-col="${key}"]`);
    column.field = get("field")?.value || column.field;
    column.label = get("label")?.value || column.label;
    column.width = Number(get("width")?.value || column.width || 18);
    column.fontSize = Number(get("fontSize")?.value || column.fontSize || 10);
    column.align = get("align")?.value || "left";
    column.bold = Boolean(get("bold")?.checked);
    column.wrap = Boolean(get("wrap")?.checked);
    column.autoWidth = Boolean(get("autoWidth")?.checked);
    column.autoHeight = Boolean(get("autoHeight")?.checked);
    if (column.autoHeight) column.wrap = true;
  });
}

function collectExcelTemplateConfig() {
  syncExcelColumnDraftFromDom();
  const base = excelTemplateCatalog.config || {};
  return {
    ...base,
    title: excelTemplateTitle.value.trim(),
    subtitle: excelTemplateSubtitle.value.trim(),
    sheetName: excelTemplateSheetName.value.trim(),
    fileName: excelTemplateFileName.value.trim(),
    tableStartRow: Number(excelTemplateStartRow.value || 5),
    showGeneratedAt: excelTemplateGeneratedAt.checked,
    showSourceUpdatedAt: excelTemplateSourceAt.checked,
    freezeHeader: excelTemplateFreeze.checked,
    autoFilter: excelTemplateFilter.checked,
    includeDivisionIds: [...excelTemplateDivisionPicker.querySelectorAll("[data-excel-division]:checked")].map((input) => input.value),
    titleStyle: { ...(base.titleStyle || {}), fontSize: Number(excelTitleFontSize.value || 16), rowHeight: Number(excelTitleRowHeight.value || 28), color: excelTitleColor.value, fill: excelTitleFill.value },
    headerStyle: { ...(base.headerStyle || {}), fontSize: Number(excelHeaderFontSize.value || 10), rowHeight: Number(excelHeaderRowHeight.value || 24), color: excelHeaderColor.value, fill: excelHeaderFill.value },
    bodyStyle: { ...(base.bodyStyle || {}), fontSize: Number(excelBodyFontSize.value || 10), rowHeight: Number(excelBodyRowHeight.value || 24), color: excelBodyColor.value, fill: excelBodyFill.value, alternateFill: excelBodyAltFill.value },
    columns: Array.isArray(base.columns) ? base.columns : []
  };
}

async function saveExcelTemplateAdmin() {
  if (!currentUser?.isDeveloper) return;
  const config = collectExcelTemplateConfig();
  if (!config.columns.length) {
    excelTemplateStatus.textContent = "Добавьте хотя бы один столбец.";
    excelTemplateStatus.classList.add("is-warning");
    return;
  }
  excelTemplateSaveButton.disabled = true;
  try {
    const response = await fetch(API_ADMIN_EXCEL_EXPORT_CONFIG, {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getSessionHeaders() },
      body: JSON.stringify({ config })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "Не удалось сохранить шаблон");
    excelTemplateCatalog.config = payload.config;
    excelTemplateCatalog.storageConfigured = Boolean(payload.config?.storageConfigured ?? true);
    excelTemplateDirty = false;
    renderExcelTemplateAdmin();
    excelTemplateStatus.textContent = "Шаблон сохранён. Следующая выгрузка будет использовать новые настройки.";
    excelTemplateStatus.classList.remove("is-warning");
  } catch (error) {
    excelTemplateStatus.textContent = error instanceof Error ? error.message : "Ошибка сохранения";
    excelTemplateStatus.classList.add("is-warning");
  } finally {
    excelTemplateSaveButton.disabled = false;
  }
}

function getSessionHeaders() {
  const sessionToken =
    getAppSessionToken();

  return sessionToken
    ? {
        "X-App-Session":
          sessionToken
      }
    : {};
}

function systemModeLabel(mode) {
  if (mode === "maintenance") {
    return "Технические работы";
  }

  if (mode === "stopped") {
    return "Система остановлена";
  }

  return "Штатный режим";
}

function renderSystemState(state) {
  currentSystemState = {
    mode:
      state?.mode || "normal",
    message:
      state?.message || "",
    storageConfigured:
      Boolean(
        state?.storageConfigured
      ),
    changedAt:
      state?.changedAt || null,
    changedBy:
      state?.changedBy || null
  };

  systemLine.classList.remove(
    "is-maintenance",
    "is-stopped"
  );

  if (
    currentSystemState.mode ===
    "maintenance"
  ) {
    systemLine.classList.add(
      "is-maintenance"
    );
  }

  if (
    currentSystemState.mode ===
    "stopped"
  ) {
    systemLine.classList.add(
      "is-stopped"
    );
  }

  systemStatusText.textContent =
    currentSystemState.message
      ? `${systemModeLabel(
          currentSystemState.mode
        )} — ${currentSystemState.message}`
      : systemModeLabel(
          currentSystemState.mode
        );

  if (adminSystemBadge) {
    adminSystemBadge.classList.remove(
      "is-maintenance",
      "is-stopped"
    );

    if (
      currentSystemState.mode ===
      "maintenance"
    ) {
      adminSystemBadge.classList.add(
        "is-maintenance"
      );
    }

    if (
      currentSystemState.mode ===
      "stopped"
    ) {
      adminSystemBadge.classList.add(
        "is-stopped"
      );
    }

    adminSystemBadge
      .querySelector("strong")
      .textContent =
        systemModeLabel(
          currentSystemState.mode
        );
  }
}

async function loadSystemState() {
  try {
    const response =
      await fetch(
        API_SYSTEM,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers:
            getSessionHeaders()
        }
      );

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return;
    }

    const payload =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось получить состояние системы"
      );
    }

    renderSystemState(
      payload
    );
  } catch (error) {
    console.error(
      "System state:",
      error
    );

    renderSystemState({
      mode: "normal",
      message:
        "Состояние режима недоступно",
      storageConfigured: false
    });
  }
}

function openModal({
  type = "development",
  eyebrow = "ИНТЕРФЕЙС ДИСПЕТЧЕРА",
  title,
  message
}) {
  modalEyebrow.textContent = eyebrow;
  modalTitle.textContent = title;
  modalMessage.textContent = message;

  modalIcon.classList.remove(
    "is-denied",
    "is-development"
  );

  modalIcon.classList.add(
    type === "denied"
      ? "is-denied"
      : "is-development"
  );

  modalIcon.innerHTML =
    type === "denied"
      ? `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3Z"></path>
          <path d="m9 9 6 6M15 9l-6 6"></path>
        </svg>
      `
      : `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 17v-5a8 8 0 0 1 16 0v5"></path>
          <path d="M4 14H2v4h4v-4H4Zm16 0h2v4h-4v-4h2Z"></path>
        </svg>
      `;

  accessModal.classList.add("is-open");
  accessModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  accessModal.classList.remove("is-open");
  accessModal.setAttribute("aria-hidden", "true");
}

async function checkSession() {
  try {
    const sessionToken =
      getAppSessionToken();

    const response =
      await fetchWithTimeout(
        API_ME,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: sessionToken
            ? {
                "X-App-Session":
                  sessionToken
              }
            : {}
        },
        STARTUP_REQUEST_TIMEOUT_MS
      );

    if (!response.ok) {
      setAppSessionToken("");
      showLoginScreen();
      return;
    }

    const payload =
      await response.json();

    if (
      payload?.authenticated &&
      payload?.user
    ) {
      showApplication(payload.user);
      return;
    }

    showLoginScreen();
  } catch {
    showLoginScreen();
  }
}

function renderDispatcherSelectOptions(
  select,
  items,
  selectedId
) {
  const list =
    Array.isArray(items)
      ? items
      : [];

  select.innerHTML =
    list.map(
      (item) => `
        <option value="${escapeHtml(item.id)}" ${item.id === selectedId ? "selected" : ""}>
          ${escapeHtml(item.name)}${item.description ? ` — ${escapeHtml(item.description)}` : ""}
        </option>
      `
    ).join("");
}

function renderDispatcherDonutChart(
  chartElement,
  segments
) {
  if (!chartElement) {
    return;
  }

  chartElement
    .querySelectorAll(
      ".dispatcher-donut-marker, .donut-ring-label"
    )
    .forEach((item) => item.remove());

  const normalized = Array.isArray(segments)
    ? segments.map((segment) => ({
        ...segment,
        value: Math.max(0, Number(segment?.value || 0))
      }))
    : [];

  const statusTotal = normalized.reduce(
    (sum, item) => sum + item.value,
    0
  );

  if (!statusTotal) {
    chartElement.style.background =
      "conic-gradient(rgba(129, 156, 178, .18) 0 100%)";
    return;
  }

  /*
    Значения выводятся прямо на кольце (в середине сектора), а не выносками:
    так они не выходят за пределы диаграммы и не накладываются друг на друга.
    Сектор, в который подпись не помещается, остаётся без цифры —
    точное значение всегда есть в легенде и во всплывающей подсказке.
    Позиция задаётся в процентах, поэтому не зависит от того,
    был ли блок видим в момент отрисовки.
  */
  const RING_RADIUS_PERCENT = 39; // середина кольца: внутренний радиус 28%, внешний 50%
  const chartSize = Math.max(
    110,
    Math.min(
      chartElement.clientWidth || 150,
      chartElement.clientHeight || chartElement.clientWidth || 150
    )
  );
  const ringRadiusPx = chartSize * (RING_RADIUS_PERCENT / 100);
  const labelSizePx = chartSize < 140 ? 20 : 24;
  const labelGapPx = 3;

  let cursor = 0;
  const gradientParts = [];
  const labelCandidates = [];

  normalized.forEach((segment) => {
    const size = (segment.value / statusTotal) * 100;
    const start = cursor;
    const end = cursor + size;

    gradientParts.push(
      `${segment.color} ${start.toFixed(3)}% ${end.toFixed(3)}%`
    );

    if (segment.value > 0) {
      const text = String(segment.value);
      const labelWidthPx = Math.max(labelSizePx, 8 + text.length * 7);
      const arcPx = (size / 100) * Math.PI * 2 * ringRadiusPx;

      if (arcPx >= labelWidthPx + labelGapPx * 2) {
        labelCandidates.push({
          segment,
          text,
          mid: (start + end) / 2,
          arcPx,
          labelWidthPx
        });
      }
    }

    cursor = end;
  });

  // Крупные сектора в приоритете; подпись ставим, только если она
  // не пересекается с уже размещёнными.
  const placed = [];
  labelCandidates
    .sort((a, b) => b.segment.value - a.segment.value)
    .forEach((item) => {
      const fits = placed.every((other) => {
        const deltaPercent = Math.min(
          Math.abs(item.mid - other.mid),
          100 - Math.abs(item.mid - other.mid)
        );
        const distancePx = (deltaPercent / 100) * Math.PI * 2 * ringRadiusPx;
        return distancePx >= (item.labelWidthPx + other.labelWidthPx) / 2 + labelGapPx;
      });

      if (fits) {
        placed.push(item);
      }
    });

  placed.forEach((item) => {
    const angle = (item.mid / 100) * Math.PI * 2 - Math.PI / 2;
    const label = document.createElement("div");

    label.className = "donut-ring-label";
    label.title = item.segment.label
      ? `${item.segment.label}: ${item.text}`
      : item.text;
    label.style.left = `${(50 + Math.cos(angle) * RING_RADIUS_PERCENT).toFixed(3)}%`;
    label.style.top = `${(50 + Math.sin(angle) * RING_RADIUS_PERCENT).toFixed(3)}%`;
    label.style.setProperty("--label-color", item.segment.color);
    label.textContent = item.text;
    chartElement.appendChild(label);
  });

  chartElement.style.background =
    `conic-gradient(${gradientParts.join(", ")})`;
}

function setDispatcherRequestCounts(
  counts
) {
  const values = {
    review: Number(counts?.review || 0),
    approved: Number(counts?.approved || 0),
    open: Number(counts?.open || 0),
    closed: Number(counts?.closed || 0),
    acknowledged: Number(
      counts?.acknowledged || 0
    ),
    ending: Number(counts?.ending || 0),
    total: Number(counts?.total || 0)
  };

  dispatcherReqReview.textContent =
    values.review;
  dispatcherReqApproved.textContent =
    values.approved;
  dispatcherReqOpen.textContent =
    values.open;
  dispatcherReqClosed.textContent =
    values.closed;
  dispatcherReqAcknowledged.textContent =
    values.acknowledged;
  dispatcherReqEnding.textContent =
    values.ending;
  dispatcherReqTotal.textContent =
    values.total;

  renderDispatcherDonutChart(
    dispatcherRequestsChart,
    [
      {
        label: "В рассмотрении",
        value: values.review,
        color: "#38bdf8"
      },
      {
        label: "Разрешена",
        value: values.approved,
        color: "#22c55e"
      },
      {
        label: "Открыта",
        value: values.open,
        color: "#8b5cf6"
      },
      {
        label: "Закрыта",
        value: values.closed,
        color: "#f59e0b"
      },
      {
        label: "Принята к сведению",
        value: values.acknowledged,
        color: "#f43f5e"
      },
      {
        label: "Заканчиваются",
        value: values.ending,
        color: "#fb7185"
      }
    ]
  );
}

function renderDispatcherSourceBreakdown(
  payload
) {
  const breakdown =
    Array.isArray(
      payload?.sources?.breakdown
    )
      ? payload.sources.breakdown
      : [];

  const unitId =
    String(
      payload?.unit?.id || ""
    );

  if (
    dispatcherBreakdownUnitId !==
    unitId
  ) {
    dispatcherBreakdownUnitId =
      unitId;
    dispatcherBreakdownSelection =
      "__all__";
    dispatcherBreakdownExpanded =
      false;
  }

  if (breakdown.length <= 1) {
    dispatcherSourceBreakdown.hidden =
      true;
    dispatcherSourceBreakdown.innerHTML =
      "";
    dispatcherBreakdownSelection =
      "__all__";
    setDispatcherRequestCounts(
      payload?.requests
    );
    dispatcherReqTotalCaption.textContent =
      "Сумма по подключённым строкам СК-11";
    return;
  }

  const selectedRow =
    dispatcherBreakdownSelection ===
      "__all__"
      ? null
      : breakdown.find(
          (item, index) =>
            String(index) ===
            dispatcherBreakdownSelection
        ) || null;

  if (
    dispatcherBreakdownSelection !==
      "__all__" &&
    !selectedRow
  ) {
    dispatcherBreakdownSelection =
      "__all__";
  }

  setDispatcherRequestCounts(
    selectedRow ||
    payload?.requests
  );

  const selectedTitle =
    selectedRow
      ? selectedRow.label ||
        selectedRow.source
      : "Общая сумма";

  dispatcherReqTotalCaption.textContent =
    selectedRow
      ? "Всего по выбранной строке СК-11"
      : "Сумма по подключённым строкам СК-11";

  dispatcherSourceBreakdown.hidden =
    false;

  dispatcherSourceBreakdown.innerHTML = `
    <button
      class="dispatcher-breakdown-toggle"
      type="button"
      data-breakdown-toggle
    >
      <span>
        Детализация по источникам
        <small>Сейчас: ${escapeHtml(selectedTitle)}</small>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true" class="${dispatcherBreakdownExpanded ? "is-open" : ""}">
        <path d="m7 10 5 5 5-5"></path>
      </svg>
    </button>

    <div
      class="dispatcher-breakdown-options"
      ${dispatcherBreakdownExpanded ? "" : "hidden"}
    >
      <button
        class="dispatcher-breakdown-chip ${dispatcherBreakdownSelection === "__all__" ? "is-active" : ""}"
        type="button"
        data-breakdown-source="__all__"
      >
        <strong>Общая сумма</strong>
        <span>${payload?.requests?.total ?? 0} всего · ${payload?.requests?.ending ?? 0} заканч.</span>
      </button>

      ${breakdown.map(
        (item, index) => `
          <button
            class="dispatcher-breakdown-chip ${dispatcherBreakdownSelection === String(index) ? "is-active" : ""} ${item.matched ? "" : "is-missing"}"
            type="button"
            data-breakdown-source="${index}"
          >
            <strong>${escapeHtml(item.label || item.source)}</strong>
            <span>
              ${item.matched ? `${item.total ?? 0} всего` : "Строка не найдена · 0"}
            </span>
          </button>
        `
      ).join("")}
    </div>
  `;

  dispatcherSourceBreakdown
    .querySelector(
      "[data-breakdown-toggle]"
    )
    ?.addEventListener(
      "click",
      () => {
        dispatcherBreakdownExpanded =
          !dispatcherBreakdownExpanded;
        renderDispatcherSourceBreakdown(
          payload
        );
      }
    );

  dispatcherSourceBreakdown
    .querySelectorAll(
      "[data-breakdown-source]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            dispatcherBreakdownSelection =
              button.dataset
                .breakdownSource ||
              "__all__";

            renderDispatcherSourceBreakdown(
              payload
            );
          }
        );
      }
    );
}


function setDispatcherWorkordersCounts(
  counts
) {
  const values = {
    registered:
      Number(counts?.registered || 0),
    created:
      Number(counts?.created || 0),
    admission:
      Number(counts?.admission || 0),
    preparation:
      Number(counts?.preparation || 0),
    break:
      Number(counts?.break || 0),
    total:
      Number(counts?.total || 0)
  };

  dispatcherWorkordersRegistered.textContent =
    values.registered;
  dispatcherWorkordersCreated.textContent =
    values.created;
  dispatcherWorkordersAdmission.textContent =
    values.admission;
  dispatcherWorkordersPreparation.textContent =
    values.preparation;
  dispatcherWorkordersBreak.textContent =
    values.break;
  dispatcherWorkordersTotal.textContent =
    values.total;

  renderDispatcherDonutChart(
    dispatcherWorkordersChart,
    [
      {
        label: "Зарегистрирован",
        value: values.registered,
        color: "#2dd4bf"
      },
      {
        label: "Создано",
        value: values.created,
        color: "#3b82f6"
      },
      {
        label: "Допуск",
        value: values.admission,
        color: "#8b5cf6"
      },
      {
        label: "Подготовка р.м.",
        value: values.preparation,
        color: "#f59e0b"
      },
      {
        label: "Перерыв",
        value: values.break,
        color: "#f43f5e"
      }
    ]
  );
}

function renderDispatcherWorkordersBreakdown(
  payload
) {
  const workorders =
    payload?.workorders || {};

  const breakdown =
    Array.isArray(
      workorders?.sources?.breakdown
    )
      ? workorders.sources.breakdown
      : [];

  const unitId =
    String(
      payload?.unit?.id || ""
    );

  if (
    dispatcherWorkordersBreakdownUnitId !==
    unitId
  ) {
    dispatcherWorkordersBreakdownUnitId =
      unitId;
    dispatcherWorkordersBreakdownSelection =
      "__all__";
    dispatcherWorkordersBreakdownExpanded =
      true;
  }

  if (breakdown.length <= 1) {
    dispatcherWorkordersBreakdown.hidden =
      true;
    dispatcherWorkordersBreakdown.innerHTML =
      "";
    dispatcherWorkordersBreakdownSelection =
      "__all__";
    setDispatcherWorkordersCounts(
      workorders?.counts
    );
    return;
  }

  let selectedRow =
    dispatcherWorkordersBreakdownSelection ===
      "__all__"
      ? null
      : breakdown.find(
          (item, index) =>
            String(index) ===
            dispatcherWorkordersBreakdownSelection
        ) || null;

  if (
    dispatcherWorkordersBreakdownSelection !==
      "__all__" &&
    !selectedRow
  ) {
    dispatcherWorkordersBreakdownSelection =
      "__all__";
    selectedRow = null;
  }

  setDispatcherWorkordersCounts(
    selectedRow ||
    workorders?.counts
  );

  const selectedTitle =
    selectedRow
      ? selectedRow.label ||
        selectedRow.source
      : "Общая сумма";

  dispatcherWorkordersBreakdown.hidden =
    false;

  dispatcherWorkordersBreakdown.innerHTML = `
    <button
      class="dispatcher-breakdown-toggle"
      type="button"
      data-workorders-breakdown-toggle
      aria-expanded="${dispatcherWorkordersBreakdownExpanded ? "true" : "false"}"
    >
      <span>
        Детализация по источникам НДР
        <small>Сейчас: ${escapeHtml(selectedTitle)}</small>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true" class="${dispatcherWorkordersBreakdownExpanded ? "is-open" : ""}">
        <path d="m7 10 5 5 5-5"></path>
      </svg>
    </button>

    <div
      class="dispatcher-breakdown-options"
      ${dispatcherWorkordersBreakdownExpanded ? "" : "hidden"}
    >
      <button
        class="dispatcher-breakdown-chip ${dispatcherWorkordersBreakdownSelection === "__all__" ? "is-active" : ""}"
        type="button"
        data-workorders-breakdown-source="__all__"
      >
        <strong>Общая сумма</strong>
        <span>${workorders?.counts?.total ?? 0} всего</span>
      </button>

      ${breakdown.map(
        (item, index) => `
          <button
            class="dispatcher-breakdown-chip ${dispatcherWorkordersBreakdownSelection === String(index) ? "is-active" : ""} ${item.matched ? "" : "is-missing"}"
            type="button"
            data-workorders-breakdown-source="${index}"
          >
            <strong>${escapeHtml(item.label || item.source)}</strong>
            <span>
              ${item.matched ? `${item.total ?? 0} всего` : "Строка не найдена · 0"}
            </span>
          </button>
        `
      ).join("")}
    </div>
  `;

  dispatcherWorkordersBreakdown
    .querySelector(
      "[data-workorders-breakdown-toggle]"
    )
    ?.addEventListener(
      "click",
      () => {
        dispatcherWorkordersBreakdownExpanded =
          !dispatcherWorkordersBreakdownExpanded;
        renderDispatcherWorkordersBreakdown(
          payload
        );
      }
    );

  dispatcherWorkordersBreakdown
    .querySelectorAll(
      "[data-workorders-breakdown-source]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            dispatcherWorkordersBreakdownSelection =
              button.dataset
                .workordersBreakdownSource ||
              "__all__";

            renderDispatcherWorkordersBreakdown(
              payload
            );
          }
        );
      }
    );
}

function renderDispatcherWorkorders(
  payload
) {
  const workorders =
    payload?.workorders || {};

  const configuredSources =
    Array.isArray(
      workorders?.sources?.configured
    )
      ? workorders.sources.configured
      : [];

  const missingSources =
    Array.isArray(
      workorders?.sources?.missing
    )
      ? workorders.sources.missing
      : [];

  dispatcherWorkordersSourcesText.textContent = "";
  dispatcherWorkordersSourcesText.hidden = true;

  renderDispatcherWorkordersBreakdown(
    payload
  );

  const sourceData =
    workorders?.sourceData || {};

  dispatcherWorkordersMeta.textContent =
    formatSourceUpdate(sourceData.sourceUpdatedAt);

  dispatcherWorkordersNotice.hidden = true;
  dispatcherWorkordersNotice.classList.remove(
    "is-warning",
    "is-error",
    "is-stale"
  );

  if (
    sourceData.status &&
    sourceData.status !== "ok"
  ) {
    dispatcherWorkordersNotice.hidden = false;
    dispatcherWorkordersNotice.textContent =
      sourceData.message ||
      "Источник данных НДР временно недоступен";

    dispatcherWorkordersNotice.classList.add(
      sourceData.status === "error"
        ? "is-error"
        : sourceData.stale
          ? "is-stale"
          : "is-warning"
    );
  } else if (missingSources.length) {
    dispatcherWorkordersNotice.hidden = false;
    dispatcherWorkordersNotice.classList.add(
      "is-warning"
    );
    dispatcherWorkordersNotice.textContent =
      `В последнем сообщении НДР не найдены строки: ${missingSources.join(", ")}`;
  }

  dispatcherWorkordersLiveBadge.classList.toggle(
    "is-stale",
    Boolean(sourceData.stale)
  );
}

function renderDispatcherOutageTable(
  tbody,
  data,
  emptyLabel
) {
  if (!tbody) return;

  const breakdown =
    Array.isArray(data?.breakdown)
      ? data.breakdown
      : [];

  if (!breakdown.length) {
    tbody.innerHTML = `
      <tr class="is-empty">
        <td colspan="3">${escapeHtml(emptyLabel)}</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = breakdown
    .map((row) => `
      <tr class="${row?.matched ? "" : "is-missing"}">
        <td>
          <strong>${escapeHtml(row?.label || row?.source || "—")}</strong>
          ${row?.matched
            ? ""
            : Number(row?.sourceCount || 0) > 0
              ? "<small>роль не найдена в последней сводке</small>"
              : "<small>для подразделения не выбраны действующие роли</small>"}
        </td>
        <td>${Number(row?.count || 0)}</td>
        <td>${Number(row?.appeals || 0)}</td>
      </tr>
    `)
    .join("");
}

function renderDispatcherOutageDetails(
  container,
  data,
  emptyLabel
) {
  if (!container) return;

  const breakdown = Array.isArray(data?.breakdown)
    ? data.breakdown
    : [];

  if (!breakdown.length) {
    container.innerHTML = `
      <div class="dispatcher-outage-detail-empty">
        ${escapeHtml(emptyLabel)}
      </div>
    `;
    return;
  }

  container.innerHTML = breakdown
    .map((division) => {
      const roleBreakdown = Array.isArray(division?.sourceBreakdown)
        ? division.sourceBreakdown
        : [];
      const count = Number(division?.count || 0);
      const appeals = Number(division?.appeals || 0);
      const selectedSources = Array.isArray(division?.selectedSources)
        ? division.selectedSources
        : [];

      return `
        <section class="dispatcher-outage-detail-division">
          <div class="dispatcher-outage-detail-division-head">
            <div>
              <span class="micro-label">ПОДРАЗДЕЛЕНИЕ</span>
              <h4>${escapeHtml(division?.label || division?.source || "—")}</h4>
              <small>
                ${selectedSources.length
                  ? `${selectedSources.length} ${pluralizeRu(selectedSources.length, "роль", "роли", "ролей")} участвует в сводке`
                  : "Роли для сводки не выбраны"}
              </small>
            </div>
            <div class="dispatcher-outage-detail-division-metrics">
              <span><b>${count}</b> откл.</span>
              <span class="${appeals > 0 ? "has-appeals" : ""}"><b>${appeals}</b> обращ.</span>
            </div>
          </div>

          ${
            roleBreakdown.length
              ? `<div class="dispatcher-outage-role-details">
                  ${roleBreakdown.map((source) => renderOutageSource(source)).join("")}
                </div>`
              : `<div class="dispatcher-outage-detail-empty is-compact">
                  Нет выбранных ролей для этого подразделения.
                </div>`
          }
        </section>
      `;
    })
    .join("");
}

function renderDispatcherOutages(payload) {
  const outages = payload?.outages || {};
  const emergency = outages?.emergency || {};
  const planned = outages?.planned || {};
  const configuredSources =
    Array.isArray(outages?.sources?.configured)
      ? outages.sources.configured
      : [];
  const configuredSelections =
    Array.isArray(outages?.sources?.selections)
      ? outages.sources.selections
      : [];

  dispatcherEmergencyOutagesCount.textContent =
    Number(emergency?.count || 0);
  dispatcherEmergencyAppealsCount.textContent =
    Number(emergency?.appeals || 0);
  dispatcherPlannedOutagesCount.textContent =
    Number(planned?.count || 0);
  dispatcherPlannedAppealsCount.textContent =
    Number(planned?.appeals || 0);

  dispatcherOutagesSourcesText.textContent = "";
  dispatcherOutagesSourcesText.hidden = true;

  renderDispatcherOutageTable(
    dispatcherEmergencyOutagesTableBody,
    emergency,
    configuredSources.length
      ? "По выбранным подразделениям нет строк аварийных отключений"
      : "Настройте подразделения отключений в Управлении приложением"
  );

  renderDispatcherOutageTable(
    dispatcherPlannedOutagesTableBody,
    planned,
    configuredSources.length
      ? "По выбранным подразделениям нет строк плановых отключений"
      : "Настройте подразделения отключений в Управлении приложением"
  );

  renderDispatcherOutageDetails(
    dispatcherEmergencyOutagesDetails,
    emergency,
    configuredSources.length
      ? "По выбранным ролям нет аварийных отключений"
      : "Настройте подразделения и роли отключений в Управлении приложением"
  );

  renderDispatcherOutageDetails(
    dispatcherPlannedOutagesDetails,
    planned,
    configuredSources.length
      ? "По выбранным ролям нет плановых отключений"
      : "Настройте подразделения и роли отключений в Управлении приложением"
  );

  const emergencySourceData = emergency?.sourceData || {};
  const plannedSourceData = planned?.sourceData || {};
  dispatcherOutagesMeta.textContent = formatSourceUpdate(
    latestSourceUpdate(
      emergencySourceData.sourceUpdatedAt,
      plannedSourceData.sourceUpdatedAt
    )
  );

  const notices = [];
  const emergencyMissing =
    Array.isArray(emergency?.missing)
      ? emergency.missing
      : [];
  const plannedMissing =
    Array.isArray(planned?.missing)
      ? planned.missing
      : [];

  if (
    emergencySourceData.status &&
    emergencySourceData.status !== "ok"
  ) {
    notices.push(
      `Аварийные: ${emergencySourceData.message || "источник временно недоступен"}`
    );
  } else if (emergencyMissing.length) {
    notices.push(
      `Аварийные — не найдены: ${emergencyMissing.join(", ")}`
    );
  }

  if (
    plannedSourceData.status &&
    plannedSourceData.status !== "ok"
  ) {
    notices.push(
      `Плановые: ${plannedSourceData.message || "источник временно недоступен"}`
    );
  } else if (plannedMissing.length) {
    notices.push(
      `Плановые — не найдены: ${plannedMissing.join(", ")}`
    );
  }

  dispatcherOutagesNotice.hidden = !notices.length;
  dispatcherOutagesNotice.textContent = notices.join(" · ");
  dispatcherOutagesNotice.classList.remove(
    "is-warning",
    "is-error",
    "is-stale"
  );

  if (notices.length) {
    const hasError =
      emergencySourceData.status === "error" ||
      plannedSourceData.status === "error";
    const isStale =
      Boolean(emergencySourceData.stale) ||
      Boolean(plannedSourceData.stale);

    dispatcherOutagesNotice.classList.add(
      hasError
        ? "is-error"
        : isStale
          ? "is-stale"
          : "is-warning"
    );
  }

  dispatcherOutagesLiveBadge.classList.toggle(
    "is-stale",
    Boolean(emergencySourceData.stale) ||
    Boolean(plannedSourceData.stale)
  );
}

function enableDispatcherOutageDetailsWheelScroll() {
  [dispatcherEmergencyOutagesDetails, dispatcherPlannedOutagesDetails]
    .filter(Boolean)
    .forEach((element) => {
      if (element.dataset.wheelScrollReady === "1") return;
      element.dataset.wheelScrollReady = "1";
      element.addEventListener(
        "wheel",
        (event) => {
          const maxScroll = element.scrollHeight - element.clientHeight;
          if (maxScroll <= 0) return;

          const movingDown = event.deltaY > 0;
          const movingUp = event.deltaY < 0;
          const canMoveDown = element.scrollTop < maxScroll - 1;
          const canMoveUp = element.scrollTop > 1;

          if ((movingDown && canMoveDown) || (movingUp && canMoveUp)) {
            event.preventDefault();
            element.scrollTop += event.deltaY;
          }
        },
        { passive: false }
      );
    });
}

enableDispatcherOutageDetailsWheelScroll();

function renderDispatcherRoleHierarchy(payload) {
  if (!dispatcherHierarchyPanel) return;

  const hierarchy = payload?.hierarchy || {};
  const mainRole = String(hierarchy?.mainRole || "").trim();
  const mainPersonNames = Array.isArray(hierarchy?.mainPersonNames)
    ? hierarchy.mainPersonNames.filter(Boolean)
    : [];
  const subordinateRoles = Array.isArray(hierarchy?.subordinateRoles)
    ? hierarchy.subordinateRoles
        .map((role) => String(role || "").trim())
        .filter(Boolean)
    : [];
  const subordinatePersonnel = Array.isArray(hierarchy?.subordinatePersonnel)
    ? hierarchy.subordinatePersonnel
    : [];
  const personnelSource = hierarchy?.personnelSource || {};

  const groupName = String(payload?.group?.name || "").trim();
  const unitName = String(payload?.unit?.name || "").trim();

  dispatcherHierarchyScope.textContent =
    [groupName, unitName].filter(Boolean).join(" · ") || "Выбранный РЭС / район";

  dispatcherHierarchyCount.textContent =
    `${subordinateRoles.length} ${pluralizeRu(subordinateRoles.length, "ПОДЧ.", "ПОДЧ.", "ПОДЧ.")}`;

  dispatcherHierarchyMainRole.textContent = mainRole || "Главная роль не настроена";
  if (dispatcherHierarchyMainPerson) {
    dispatcherHierarchyMainPerson.textContent = mainPersonNames.length
      ? mainPersonNames.join(" · ")
      : "(ФИО не указано)";
    dispatcherHierarchyMainPerson.classList.toggle("is-missing", !mainPersonNames.length);
  }

  if (dispatcherHierarchySourceMeta) {
    if (personnelSource?.configured) {
      const update = personnelSource?.sourceUpdatedAt
        ? ` · ${personnelSource.sourceUpdatedAt}`
        : "";
      dispatcherHierarchySourceMeta.textContent =
        `Дежурный персонал СК-11${update}`;
      dispatcherHierarchySourceMeta.classList.toggle(
        "is-warning",
        personnelSource?.status === "stale" || personnelSource?.status === "error"
      );
    } else {
      dispatcherHierarchySourceMeta.textContent = "Источник ФИО не настроен";
      dispatcherHierarchySourceMeta.classList.add("is-warning");
    }
  }

  const subordinateRows = subordinateRoles.map((role, index) => {
    const entry = subordinatePersonnel.find(
      (item) => String(item?.role || "").trim() === role
    );
    const names = Array.isArray(entry?.personNames)
      ? entry.personNames.filter(Boolean)
      : [];
    return {
      role,
      names,
      index,
      hasPersonnel: names.length > 0,
    };
  });

  subordinateRows.sort((left, right) => {
    if (left.hasPersonnel !== right.hasPersonnel) {
      return left.hasPersonnel ? -1 : 1;
    }
    return left.index - right.index;
  });

  dispatcherHierarchySubordinateList.innerHTML = subordinateRows.length
    ? subordinateRows
        .map(({ role, names }) => `
            <tr>
              <td>${escapeHtml(role)}</td>
              <td class="${names.length ? "" : "is-missing"}">
                ${escapeHtml(names.length ? names.join(" · ") : "(ФИО не указано)")}
              </td>
            </tr>
          `)
        .join("")
    : `<tr><td colspan="2" class="is-empty">Подчинённые роли не настроены</td></tr>`;
}

function renderDispatcherDashboard(payload) {
  const groups =
    Array.isArray(
      payload?.availableGroups
    )
      ? payload.availableGroups
      : [];

  const units =
    Array.isArray(
      payload?.availableUnits
    )
      ? payload.availableUnits
      : [];

  const selectedGroupId =
    String(
      payload?.group?.id ||
      groups[0]?.id ||
      ""
    );

  const selectedUnitId =
    String(
      payload?.unit?.id ||
      units[0]?.id ||
      ""
    );

  selectedDispatcherGroupId =
    selectedGroupId;

  selectedDispatcherUnitId =
    selectedUnitId;

  renderDispatcherSelectOptions(
    dispatcherGroupSelect,
    groups,
    selectedGroupId
  );

  renderDispatcherSelectOptions(
    dispatcherUnitSelect,
    units,
    selectedUnitId
  );

  dispatcherGroupSelectWrap.hidden =
    groups.length <= 1;

  const fullDispatcherScope =
    Boolean(
      payload?.hasAllDispatcherGroups
    );

  dispatcherAssignedDivision.textContent =
    fullDispatcherScope
      ? "Все подразделения"
      : (
          payload?.assignedGroupName ||
          payload?.group?.name ||
          "Не задан"
        );

  dispatcherAssignedHint.textContent =
    payload?.isDeveloper
      ? "Системная роль Разработчик · полный доступ"
      : fullDispatcherScope
        ? "Роль разрешает переключение между всеми подразделениями"
        : "Доступ ограничен подразделением назначенной роли";

  dispatcherUnitTitle.textContent =
    payload?.unit
      ? `${payload.unit.name} · ${payload?.group?.name || ""}`
      : "Оперативный счётчик";

  renderDispatcherRoleHierarchy(payload);

  setDispatcherRequestCounts(
    payload?.requests
  );

  const configuredSources =
    Array.isArray(
      payload?.sources?.configured
    )
      ? payload.sources.configured
      : [];

  const missingSources =
    Array.isArray(
      payload?.sources?.missing
    )
      ? payload.sources.missing
      : [];

  dispatcherSourcesText.textContent = "";
  dispatcherSourcesText.hidden = true;

  renderDispatcherSourceBreakdown(
    payload
  );

  const sourceData =
    payload?.sourceData || {};

  dispatcherSourceMeta.textContent =
    formatSourceUpdate(sourceData.sourceUpdatedAt);

  dispatcherDataNotice.hidden = true;
  dispatcherDataNotice.classList.remove(
    "is-warning",
    "is-error",
    "is-stale"
  );

  if (
    sourceData.status &&
    sourceData.status !== "ok"
  ) {
    dispatcherDataNotice.hidden = false;
    dispatcherDataNotice.textContent =
      sourceData.message ||
      "Источник данных временно недоступен";

    dispatcherDataNotice.classList.add(
      sourceData.status === "error"
        ? "is-error"
        : sourceData.status === "stale"
          ? "is-stale"
          : "is-warning"
    );
  } else if (missingSources.length) {
    dispatcherDataNotice.hidden = false;
    dispatcherDataNotice.classList.add(
      "is-warning"
    );
    dispatcherDataNotice.textContent =
      `В последнем СК-11 не найдены строки: ${missingSources.join(", ")}`;
  }

  dispatcherLiveBadge.classList.toggle(
    "is-stale",
    Boolean(sourceData.stale)
  );

  renderDispatcherWorkorders(
    payload
  );

  renderDispatcherOutages(
    payload
  );

  const workordersUpdatedAt =
    payload?.workorders?.sourceData?.sourceUpdatedAt ||
    "";
  const emergencyOutagesUpdatedAt =
    payload?.outages?.emergency?.sourceData?.sourceUpdatedAt ||
    "";
  const plannedOutagesUpdatedAt =
    payload?.outages?.planned?.sourceData?.sourceUpdatedAt ||
    "";

  const dispatcherLatestUpdate = latestSourceUpdate(
    sourceData.sourceUpdatedAt,
    workordersUpdatedAt,
    emergencyOutagesUpdatedAt,
    plannedOutagesUpdatedAt
  );

  dispatcherUpdatedAt.textContent = formatSourceUpdate(
    dispatcherLatestUpdate || (payload?.updatedAt ? formatDateTime(payload.updatedAt) : "")
  );
}

loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    clearLoginError();

    const username =
      usernameInput.value.trim();

    const password =
      passwordInput.value;

    if (!username || !password) {
      showLoginError(
        "Введите логин и пароль"
      );
      return;
    }

    loginButton.disabled = true;
    loginButton.querySelector("span").textContent =
      "Подготовка MAX…";

    const initData =
      await waitForMaxInitData();

    if (!initData) {
      loginButton.disabled = false;
      loginButton.querySelector("span").textContent =
        "Войти в систему";

      showLoginError(
        "MAX Bridge не успел загрузиться. Проверьте интернет и нажмите «Войти» ещё раз."
      );
      return;
    }

    loginButton.querySelector("span").textContent =
      "Проверка доступа…";

    try {
      const response = await fetchWithTimeout(
        API_LOGIN,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
            "X-Max-Init-Data":
              initData
          },
          body: JSON.stringify({
            username,
            password
          })
        },
        LOGIN_REQUEST_TIMEOUT_MS
      );

      const payload =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Не удалось выполнить вход"
        );
      }

      setAppSessionToken(
        payload?.sessionToken || ""
      );

      passwordInput.value = "";
      showApplication(payload.user);
    } catch (error) {
      const isTimeout =
        error?.name ===
        "AbortError";

      showLoginError(
        isTimeout
          ? "Соединение слишком медленное. Приложение уже загружено — проверьте сеть и повторите вход."
          : error instanceof Error
            ? error.message
            : "Ошибка авторизации"
      );
    } finally {
      loginButton.disabled = false;
      loginButton.querySelector("span").textContent =
        "Войти в систему";
    }
  }
);

togglePassword.addEventListener(
  "click",
  () => {
    const hidden =
      passwordInput.type === "password";

    passwordInput.type =
      hidden ? "text" : "password";

    togglePassword.setAttribute(
      "aria-label",
      hidden
        ? "Скрыть пароль"
        : "Показать пароль"
    );
  }
);

logoutButton.addEventListener(
  "click",
  async () => {
    stopAutoRefresh();

    try {
      await fetch(
        API_LOGOUT,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers:
            getSessionHeaders()
        }
      );
    } finally {
      setAppSessionToken("");
      usernameInput.value = "";
      passwordInput.value = "";
      showLoginScreen();
    }
  }
);

brandHomeButton.addEventListener(
  "click",
  navigateHome
);

backToMenuButton.addEventListener(
  "click",
  () => {
    if (currentView === "monitoring" && selectedOutageKind) {
      showOutageTypeSelector({ refresh: true });
      return;
    }

    navigateHome();
  }
);

backFromDispatcherButton.addEventListener(
  "click",
  navigateHome
);

backFromExecutiveButton.addEventListener(
  "click",
  navigateHome
);

backFromAdminButton.addEventListener(
  "click",
  navigateHome
);

openMonitoringButton.addEventListener(
  "click",
  navigateMonitoring
);

emergencyOutagesChoice?.addEventListener(
  "click",
  () => openOutageKind("emergency")
);

plannedOutagesChoice?.addEventListener(
  "click",
  () => openOutageKind("planned")
);

openExecutiveButton.addEventListener(
  "click",
  navigateExecutive
);

openExcelExportsButton?.addEventListener(
  "click",
  navigateExcelExports
);

backFromExcelExportsButton?.addEventListener(
  "click",
  navigateHome
);

excelTogglePreviewButton?.addEventListener(
  "click",
  async () => {
    if (excelPreviewOpen) {
      setExcelPreviewOpen(false);
      return;
    }

    setExcelPreviewOpen(true);
    await loadExcelPreview();
  }
);

excelRefreshPreviewButton?.addEventListener(
  "click",
  () => loadExcelPreview()
);

excelPreviewLimit?.addEventListener(
  "change",
  () => {
    if (currentView === "excel-exports" && excelPreviewOpen) {
      loadExcelPreview();
    }
  }
);

excelDownloadEmergencyButton?.addEventListener(
  "click",
  downloadEmergencyExcel
);

excelTemplateSaveButton?.addEventListener(
  "click",
  saveExcelTemplateAdmin
);

excelExportManagementPanel?.addEventListener(
  "input",
  (event) => {
    if (event.target.closest("input, textarea, select")) {
      markExcelTemplateDirty();
    }
  }
);

excelExportManagementPanel?.addEventListener(
  "change",
  (event) => {
    if (event.target.closest("input, textarea, select")) {
      markExcelTemplateDirty();
    }
  }
);

excelTemplateAddColumnButton?.addEventListener(
  "click",
  () => {
    syncExcelColumnDraftFromDom();
    const columns = excelTemplateCatalog.config?.columns || [];
    const fallback = { id: "pending", name: "Новый столбец", type: "text" };
    columns.push({
      id: `column-${Date.now()}`,
      field: fallback.id,
      label: fallback.name,
      width: 18,
      align: "left",
      fontSize: 10,
      bold: false,
      wrap: true,
      autoWidth: false,
      autoHeight: false
    });
    markExcelTemplateDirty();
    renderExcelTemplateColumns();
  }
);

excelTemplateColumns?.addEventListener(
  "change",
  (event) => {
    const input = event.target.closest("[data-excel-col]");
    if (!input) return;
    const row = input.closest("[data-excel-column-index]");
    if (!row) return;

    if (input.dataset.excelCol === "autoWidth") {
      const widthInput = row.querySelector('[data-excel-col="width"]');
      if (widthInput) widthInput.disabled = Boolean(input.checked);
    }

    if (input.dataset.excelCol === "autoHeight" && input.checked) {
      const wrapInput = row.querySelector('[data-excel-col="wrap"]');
      if (wrapInput) wrapInput.checked = true;
    }

    markExcelTemplateDirty();
  }
);

excelTemplateColumns?.addEventListener(
  "click",
  (event) => {
    const button = event.target.closest("[data-excel-column-action]");
    if (!button) return;
    const row = button.closest("[data-excel-column-index]");
    const index = Number(row?.dataset.excelColumnIndex);
    if (!Number.isInteger(index)) return;
    syncExcelColumnDraftFromDom();
    const columns = excelTemplateCatalog.config?.columns || [];
    const action = button.dataset.excelColumnAction;
    let changed = false;
    if (action === "up" && index > 0) {
      [columns[index - 1], columns[index]] = [columns[index], columns[index - 1]];
      changed = true;
    } else if (action === "down" && index < columns.length - 1) {
      [columns[index + 1], columns[index]] = [columns[index], columns[index + 1]];
      changed = true;
    } else if (action === "remove" && columns.length > 1) {
      columns.splice(index, 1);
      changed = true;
    }
    if (changed) markExcelTemplateDirty();
    renderExcelTemplateColumns();
  }
);

openAdminButton.addEventListener(
  "click",
  navigateAdmin
);

openDispatcherButton.addEventListener(
  "click",
  navigateDispatcher
);

executiveEl("executiveGroupSelect").addEventListener(
  "change",
  () => {
    selectedExecutiveGroupId = executiveEl("executiveGroupSelect").value;
    selectedExecutiveUnitId = "";

    if (currentView === "executive") {
      loadExecutiveDashboard();
    }
  }
);

executiveEl("executiveUnitSelect").addEventListener(
  "change",
  () => {
    selectedExecutiveUnitId = executiveEl("executiveUnitSelect").value;

    if (currentView === "executive") {
      loadExecutiveDashboard();
    }
  }
);

dispatcherGroupSelect.addEventListener(
  "change",
  () => {
    selectedDispatcherGroupId =
      dispatcherGroupSelect.value;
    selectedDispatcherUnitId = "";

    if (currentView === "dispatcher") {
      loadDispatcherDashboard();
    }
  }
);

dispatcherUnitSelect.addEventListener(
  "change",
  () => {
    selectedDispatcherUnitId =
      dispatcherUnitSelect.value;

    if (currentView === "dispatcher") {
      loadDispatcherDashboard();
    }
  }
);

dispatcherRefreshButton.addEventListener(
  "click",
  () =>
    loadDispatcherDashboard()
);

closeModalButton.addEventListener(
  "click",
  closeModal
);

modalActionButton.addEventListener(
  "click",
  closeModal
);

accessModal.addEventListener(
  "click",
  (event) => {
    if (event.target === accessModal) {
      closeModal();
    }
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      accessModal.classList.contains(
        "is-open"
      )
    ) {
      closeModal();
    }
  }
);

/* =========================================================
   HEARTBEAT + ЦЕНТР УПРАВЛЕНИЯ
   ========================================================= */

async function sendHeartbeat() {
  if (!currentUser) {
    return;
  }

  try {
    const response =
      await fetch(
        API_HEARTBEAT,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers:
            getSessionHeaders()
        }
      );

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return;
    }

    if (response.ok) {
      const payload =
        await response
          .json()
          .catch(() => null);

      if (payload?.user) {
        setUserUi(
          payload.user
        );

        /*
          Если во время открытой сессии у пользователя
          забрали доступ к текущей панели, возвращаем его
          в главное меню. Backend и так уже блокирует запросы,
          это только синхронизация интерфейса.
        */
        if (
          currentView === "admin" &&
          !hasPanelAccess(
            "system-control"
          )
        ) {
          navigateHome();
        }

        if (
          currentView === "monitoring" &&
          !hasPanelAccess(
            "monitoring"
          )
        ) {
          navigateHome();
        }

        if (
          currentView === "dispatcher" &&
          !hasPanelAccess(
            "dispatcher"
          )
        ) {
          navigateHome();
        }

        if (
          currentView === "executive" &&
          !hasPanelAccess(
            "executive-monitoring"
          )
        ) {
          navigateHome();
        }
      }
    }
  } catch (error) {
    console.error(
      "Heartbeat:",
      error
    );
  }
}

function startHeartbeat() {
  stopHeartbeat();

  sendHeartbeat();

  heartbeatTimer =
    setInterval(
      () => {
        if (isAppVisible()) {
          sendHeartbeat();
        }
      },
      HEARTBEAT_INTERVAL_MS
    );
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(
      heartbeatTimer
    );

    heartbeatTimer = null;
  }
}

function sourceUpdateTimeValue(value) {
  const text = String(value || "").trim();
  if (!text) return Number.NaN;

  const ruMatch = text.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,]+)(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (ruMatch) {
    const [, day, month, year, hour, minute, second = "0"] = ruMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ).getTime();
  }

  const parsed = new Date(text).getTime();
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function latestSourceUpdate(...values) {
  const candidates = values
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (!candidates.length) return "";

  return candidates.reduce((latest, current) => {
    const latestTime = sourceUpdateTimeValue(latest);
    const currentTime = sourceUpdateTimeValue(current);

    if (Number.isNaN(currentTime)) return latest;
    if (Number.isNaN(latestTime)) return current;
    return currentTime > latestTime ? current : latest;
  });
}

function formatSourceUpdate(value) {
  const text = String(value || "").trim();
  return text ? `Обновлено: ${text}` : "Обновлено: —";
}

function formatDateTime(value) {
  if (!value) {
    return "Нет данных";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Нет данных";
  }

  return date.toLocaleString(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function userRoleText(user) {
  if (
    Array.isArray(
      user?.roleNames
    ) &&
    user.roleNames.length
  ) {
    return user.roleNames.join(
      " · "
    );
  }

  if (
    user?.isDeveloper &&
    user?.isDispatcher
  ) {
    return "Разработчик · Диспетчер";
  }

  if (user?.isDeveloper) {
    return "Разработчик";
  }

  if (user?.isDispatcher) {
    return "Диспетчер";
  }

  return "Пользователь";
}

function renderAdminUsers(users) {
  if (
    !Array.isArray(users) ||
    !users.length
  ) {
    sessionList.innerHTML = `
      <div class="session-empty">
        Пользователи не найдены.
      </div>
    `;

    return;
  }

  const manageable =
    Boolean(
      currentUser?.isDeveloper
    );

  sessionList.innerHTML =
    users.map(
      (user) => {
        const lastSession =
          user.online
            ? `Последняя активность: ${formatDateTime(
                user.lastSeenAt
              )}`
            : user.lastSessionAt
              ? `Последний сеанс: ${formatDateTime(
                  user.lastSessionAt
                )}`
              : "Ещё не входил";

        const loginText =
          user.lastLoginAt
            ? `Последний вход: ${formatDateTime(
                user.lastLoginAt
              )}`
            : "Входов пока нет";

        const roleBadges =
          Array.isArray(user.roles) && user.roles.length
            ? user.roles.map((role) => ({
                name: role.name || role.id,
                color: normalizeRoleColor(role.color)
              }))
            : (
                Array.isArray(user.roleNames) && user.roleNames.length
                  ? user.roleNames.map((name) => ({
                      name,
                      color: "#39c6e6"
                    }))
                  : [{
                      name: userRoleText(user),
                      color: "#39c6e6"
                    }]
              );

        return `
          <div
            class="session-row ${
              manageable
                ? "is-manageable"
                : ""
            }"
            data-username="${escapeHtml(
              user.username
            )}"
            role="${
              manageable
                ? "button"
                : "group"
            }"
            tabindex="${
              manageable
                ? "0"
                : "-1"
            }"
          >
            <div class="session-person">
              <strong>
                ${escapeHtml(
                  user.fullName ||
                  user.username
                )}
              </strong>
              <span>
                ${escapeHtml(
                  user.username
                )} · ${escapeHtml(
                  loginText
                )}
              </span>
            </div>

            <div class="session-role-stack">
              ${roleBadges
                .map(
                  (role) => `
                    <span
                      class="session-role"
                      style="color:${normalizeRoleColor(role.color)};border-color:${roleColorRgba(role.color,.28)};background:${roleColorRgba(role.color,.08)}"
                    >
                      ${escapeHtml(
                        role.name
                      )}
                    </span>
                  `
                )
                .join("")}
            </div>

            <div class="session-status">
              <strong class="${
                user.online
                  ? "is-online"
                  : ""
              }">
                <i></i>
                ${
                  user.online
                    ? "Сейчас в системе"
                    : "Не в системе"
                }
              </strong>
              <small>
                ${escapeHtml(
                  lastSession
                )}
              </small>
            </div>
          </div>
        `;
      }
    ).join("");

  if (manageable) {
    sessionList
      .querySelectorAll(
        ".session-row"
      )
      .forEach(
        (row) => {
          const open =
            () =>
              openUserRoleEditor(
                row.dataset.username
              );

          row.addEventListener(
            "click",
            open
          );

          row.addEventListener(
            "keydown",
            (event) => {
              if (
                event.key ===
                  "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                open();
              }
            }
          );
        }
      );
  }
}

function selectMode(mode) {
  selectedSystemMode =
    mode;

  modeSelector
    .querySelectorAll(
      ".mode-option"
    )
    .forEach(
      (button) => {
        button.classList.toggle(
          "is-selected",
          button.dataset.mode ===
            mode
        );
      }
    );
}

function renderAdminDashboard(
  payload
) {
  renderAdminStorageInfo(payload?.storage);

  storageWarning.hidden =
    Boolean(
      payload.storageConfigured
    );

  adminOnlineCount.textContent =
    payload.onlineCount ?? "—";

  adminTotalUsers.textContent =
    payload.totalUsers ?? "—";

  adminDispatcherCount.textContent =
    payload.dispatcherCount ?? "—";

  adminDeveloperCount.textContent =
    payload.developerCount ?? "—";

  const system =
    payload.system || {
      mode: "normal",
      message: ""
    };

  renderSystemState(system);

  selectMode(
    system.mode || "normal"
  );

  systemMessageInput.value =
    system.message || "";

  if (system.changedAt) {
    const who =
      system.changedBy?.fullName ||
      system.changedBy?.username ||
      "неизвестно";

    systemChangedInfo.textContent =
      `Изменено ${formatDateTime(
        system.changedAt
      )} · ${who}`;
  } else {
    systemChangedInfo.textContent =
      payload.storageConfigured
        ? "Режим ещё не изменялся"
        : "Хранилище состояния не подключено";
  }

  renderAdminUsers(
    payload.users
  );

  accessManagementPanel.hidden =
    !Boolean(
      payload.canManageRoles
    );

  createUserButton.hidden =
    !Boolean(
      payload.canManageRoles
    );

  outageManagementPanel.hidden =
    !Boolean(
      payload.canManageRoles
    );

  dispatcherSourceManagementPanel.hidden =
    !Boolean(
      payload.canManageRoles
    );

  if (dispatcherHierarchyManagementPanel) {
    dispatcherHierarchyManagementPanel.hidden =
      !Boolean(payload.canManageRoles);
  }

  executiveTableManagementPanel.hidden =
    !Boolean(
      payload.canManageRoles
    );

  if (executiveMapManagementPanel) {
    executiveMapManagementPanel.hidden =
      !Boolean(payload.canManageRoles);
  }

  if (excelExportManagementPanel) {
    excelExportManagementPanel.hidden =
      !Boolean(payload.canManageRoles);
  }

  dispatcherWorkordersManagementPanel.hidden =
    !Boolean(
      payload.canManageRoles
    );

  if (
    payload.canManageRoles
  ) {
    loadAccessManagement();
    loadOutageConfigManagement();
    loadDispatcherConfigManagement();
    loadExcelTemplateAdmin();
  }

  adminUpdatedAt.textContent =
    `Обновлено ${new Date().toLocaleTimeString(
      "ru-RU",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    )}`;
}

function renderAdminStorageInfo(storage) {
  const box = document.getElementById("adminStorageInfo");
  if (!box) return;
  if (!storage) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const health = storage.health;
  const healthText = health
    ? health.ok
      ? `проверка: OK (${health.latencyMs} мс)`
      : `проверка: ОШИБКА — ${health.error}`
    : "";
  if (storage.backend === "redis") {
    box.textContent = ["Хранилище: внешний Redis (Upstash)", healthText].filter(Boolean).join(" · ");
    box.classList.toggle("is-warning", Boolean(health && !health.ok));
    return;
  }
  const parts = [`Хранилище: сервер (${Number(storage.keys || 0)} записей)`];
  if (storage.restoredFrom) parts.push(`загружено: ${String(storage.restoredFrom).startsWith("s3") ? "из S3" : "с диска"}`);
  if (storage.s3Backup) {
    parts.push(storage.lastS3Upload ? `копия в S3: ${formatDateTime(storage.lastS3Upload)}` : "копия в S3: ожидается");
  } else {
    parts.push("копия в S3 не настроена — данные могут пропасть при новом деплое");
  }
  if (storage.lastS3Error) parts.push(`ошибка S3: ${storage.lastS3Error}`);
  if (healthText) parts.push(healthText);
  box.textContent = parts.join(" · ");
  box.classList.toggle("is-warning", !storage.s3Backup || Boolean(storage.lastS3Error) || Boolean(health && !health.ok));
}

async function loadAdminDashboard() {
  if (
    !hasPanelAccess(
      "system-control"
    )
  ) {
    return;
  }

  sessionList.innerHTML = `
    <div class="session-loading">
      Обновление данных центра управления…
    </div>
  `;

  try {
    const response =
      await fetch(
        API_ADMIN_DASHBOARD,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers:
            getSessionHeaders()
        }
      );

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return;
    }

    if (response.status === 403) {
      navigateHome();
      return;
    }

    const payload =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось загрузить центр управления"
      );
    }

    renderAdminDashboard(
      payload
    );
  } catch (error) {
    sessionList.innerHTML = `
      <div class="session-empty">
        ${escapeHtml(
          error instanceof Error
            ? error.message
            : "Ошибка загрузки"
        )}
      </div>
    `;
  }
}

async function saveSystemState() {
  if (
    !hasPanelAccess(
      "system-control"
    )
  ) {
    return;
  }

  saveSystemStateButton.disabled =
    true;

  saveSystemStateButton
    .querySelector("span")
    .textContent =
      "Применение…";

  try {
    const response =
      await fetch(
        API_ADMIN_SYSTEM,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
            ...getSessionHeaders()
          },
          body: JSON.stringify({
            mode:
              selectedSystemMode,
            message:
              systemMessageInput.value
                .trim()
          })
        }
      );

    const payload =
      await response
        .json()
        .catch(() => null);

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return;
    }

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось применить режим"
      );
    }

    renderSystemState(
      payload.system
    );

    await loadAdminDashboard();

    openModal({
      type: "development",
      eyebrow:
        "ЦЕНТР УПРАВЛЕНИЯ",
      title:
        "Режим применён",
      message:
        `Текущее состояние: ${systemModeLabel(
          payload.system.mode
        )}.`
    });
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow:
        "ЦЕНТР УПРАВЛЕНИЯ",
      title:
        "Не удалось изменить режим",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  } finally {
    saveSystemStateButton.disabled =
      false;

    saveSystemStateButton
      .querySelector("span")
      .textContent =
        "Применить режим";
  }
}

function panelNameById(
  panelId
) {
  return (
    accessCatalog.panels.find(
      (panel) =>
        panel.id === panelId
    )?.name ||
    panelId
  );
}

function roleById(
  roleId
) {
  return (
    accessCatalog.roles.find(
      (role) =>
        role.id === roleId
    ) || null
  );
}

function renderRoleList() {
  if (
    !Array.isArray(
      accessCatalog.roles
    ) ||
    !accessCatalog.roles.length
  ) {
    roleList.innerHTML = `
      <div class="access-empty">
        Роли не найдены.
      </div>
    `;

    return;
  }

  roleList.innerHTML =
    accessCatalog.roles.map(
      (role) => `
        <article
          class="role-card ${
            role.builtin
              ? "is-builtin"
              : ""
          }"
          style="--role-accent: ${normalizeRoleColor(role.color)}; --role-accent-soft: ${roleColorRgba(role.color, 0.12)}; --role-accent-line: ${roleColorRgba(role.color, 0.32)}"
        >
          <div class="role-card-top">
            <div class="role-card-name">
              <strong>
                ${escapeHtml(
                  role.name
                )}
              </strong>
              <span>
                ${escapeHtml(
                  role.description ||
                  "Без описания"
                )}
              </span>
            </div>

            <div class="role-card-kind-wrap">
              <span class="role-color-swatch" title="Цвет роли" style="background: ${normalizeRoleColor(role.color)}"></span>
              <span
                class="role-kind ${
                  role.builtin
                    ? ""
                    : "is-custom"
                }"
              >
                ${
                  role.builtin
                    ? "СИСТЕМНАЯ"
                    : "ПОЛЬЗОВАТЕЛЬСКАЯ"
                }
              </span>
            </div>
          </div>

          <div class="role-panels">
            ${
              role.panelIds?.length
                ? role.panelIds
                    .map(
                      (panelId) => `
                        <span class="role-panel-chip">
                          ${escapeHtml(
                            panelNameById(
                              panelId
                            )
                          )}
                        </span>
                      `
                    )
                    .join("")
                : `
                  <span class="role-panel-chip">
                    Нет доступа к панелям
                  </span>
                `
            }
            ${
              role.dispatcherAllDivisions
                ? `
                  <span class="role-panel-chip role-panel-chip-dispatcher">
                    Контур: Все подразделения
                  </span>
                `
                : role.dispatcherDivisionName
                  ? `
                    <span class="role-panel-chip role-panel-chip-dispatcher">
                      Контур: ${escapeHtml(
                        role.dispatcherDivisionName
                      )}
                    </span>
                  `
                  : ""
            }
          </div>

          <div class="role-card-actions">
            ${
              role.builtin
                ? `
                  <button
                    class="role-action role-color-action"
                    type="button"
                    data-color-role="${role.id}"
                  >
                    Цвет роли
                  </button>
                `
                : `
                  <button
                    class="role-action"
                    type="button"
                    data-edit-role="${role.id}"
                  >
                    Изменить
                  </button>

                  <button
                    class="role-action role-color-action"
                    type="button"
                    data-color-role="${role.id}"
                  >
                    Цвет
                  </button>

                  <button
                    class="role-action is-danger"
                    type="button"
                    data-delete-role="${role.id}"
                  >
                    Удалить
                  </button>
                `
            }
          </div>
        </article>
      `
    ).join("");

  roleList
    .querySelectorAll(
      "[data-edit-role]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            openRoleEditor(
              button.dataset
                .editRole
            )
        );
      }
    );

  roleList
    .querySelectorAll(
      "[data-color-role]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            openRoleColorEditor(
              button.dataset.colorRole
            )
        );
      }
    );

  roleList
    .querySelectorAll(
      "[data-delete-role]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            deleteCustomRole(
              button.dataset
                .deleteRole
            )
        );
      }
    );
}

async function loadAccessManagement() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  try {
    const response =
      await fetch(
        API_ADMIN_ACCESS,
        {
          method: "GET",
          cache: "no-store",
          credentials:
            "include",
          headers:
            getSessionHeaders()
        }
      );

    const payload =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось загрузить роли"
      );
    }

    accessCatalog = {
      panels:
        Array.isArray(
          payload.panels
        )
          ? payload.panels
          : [],
      roles:
        Array.isArray(
          payload.roles
        )
          ? payload.roles
          : [],
      users:
        Array.isArray(
          payload.users
        )
          ? payload.users
          : [],
      dispatcherDivisions:
        Array.isArray(
          payload.dispatcherDivisions
        )
          ? payload.dispatcherDivisions
          : []
    };

    renderRoleList();
  } catch (error) {
    roleList.innerHTML = `
      <div class="access-empty">
        ${escapeHtml(
          error instanceof Error
            ? error.message
            : "Ошибка загрузки ролей"
        )}
      </div>
    `;
  }
}



function renderOutageConfigList() {
  const divisions =
    Array.isArray(outageConfigCatalog.divisions)
      ? outageConfigCatalog.divisions
      : [];

  const unassignedEmergency =
    Array.isArray(outageConfigCatalog?.unassignedSources?.emergency)
      ? outageConfigCatalog.unassignedSources.emergency
      : [];

  const unassignedPlanned =
    Array.isArray(outageConfigCatalog?.unassignedSources?.planned)
      ? outageConfigCatalog.unassignedSources.planned
      : [];

  const unassignedHtml = `
    <div class="outage-unassigned-grid">
      <section class="outage-unassigned-card ${unassignedEmergency.length ? "has-items" : "is-clear"}">
        <div class="outage-unassigned-head">
          <div>
            <span class="micro-label">АВАРИЙНЫЙ ЧАТ</span>
            <strong>Не распределённые роли</strong>
          </div>
          <b>${unassignedEmergency.length}</b>
        </div>
        <div class="outage-unassigned-list">
          ${unassignedEmergency.length
            ? unassignedEmergency.map((label) => `<span>${escapeHtml(label)}</span>`).join("")
            : `<span class="is-clear-label">Все найденные роли уже используются в настройках подразделений.</span>`}
        </div>
      </section>

      <section class="outage-unassigned-card is-planned ${unassignedPlanned.length ? "has-items" : "is-clear"}">
        <div class="outage-unassigned-head">
          <div>
            <span class="micro-label">ПЛАНОВЫЙ ЧАТ</span>
            <strong>Не распределённые роли</strong>
          </div>
          <b>${unassignedPlanned.length}</b>
        </div>
        <div class="outage-unassigned-list">
          ${unassignedPlanned.length
            ? unassignedPlanned.map((label) => `<span>${escapeHtml(label)}</span>`).join("")
            : `<span class="is-clear-label">Все найденные роли уже используются в настройках подразделений.</span>`}
        </div>
      </section>
    </div>
  `;

  outageCreateDivisionButton.disabled =
    !outageConfigCatalog.storageConfigured;

  if (!divisions.length) {
    outageConfigList.innerHTML = `${unassignedHtml}
      <div class="access-empty dispatcher-structure-empty">
        <strong>Подразделений пока нет</strong>
        <span>
          Нажмите «+ Подразделение», чтобы создать первый счётчик
          аварийного мониторинга.
        </span>
      </div>
    `;
    return;
  }

  outageConfigList.innerHTML =
    unassignedHtml +
    divisions.map(
      (division) => {
        const sources =
          Array.isArray(division.sources)
            ? division.sources
            : [];

        return `
          <article class="dispatcher-config-card outage-config-card">
            <div class="dispatcher-config-card-head">
              <div>
                <span class="micro-label">АКТИВНЫЕ ОТКЛЮЧЕНИЯ</span>
                <h3>${escapeHtml(division.name)}</h3>
              </div>

              <span class="dispatcher-config-state ${sources.length ? "is-custom" : ""}">
                ${sources.length ? `${sources.length} ИСТ.` : "НЕ НАСТРОЕНО"}
              </span>
            </div>

            <div class="dispatcher-config-sources">
              ${
                sources.length
                  ? sources
                      .map(
                        (source) => `
                          <span>${escapeHtml(source)}</span>
                        `
                      )
                      .join("")
                  : `
                    <span class="is-empty">
                      Источники не выбраны · счётчик будет равен нулю
                    </span>
                  `
              }
            </div>

            <div class="dispatcher-config-card-actions">
              <button
                class="role-action dispatcher-config-edit"
                type="button"
                data-outage-division="${escapeHtml(division.id)}"
              >
                Настроить
              </button>

              <button
                class="role-action is-danger"
                type="button"
                data-delete-outage-division="${escapeHtml(division.id)}"
                data-delete-outage-division-name="${escapeHtml(division.name)}"
              >
                Удалить
              </button>
            </div>
          </article>
        `;
      }
    ).join("");

  outageConfigList
    .querySelectorAll("[data-outage-division]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => openOutageDivisionEditor(
          button.dataset.outageDivision
        )
      );
    });

  outageConfigList
    .querySelectorAll("[data-delete-outage-division]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => deleteOutageDivisionFromAdmin(
          button.dataset.deleteOutageDivision,
          button.dataset.deleteOutageDivisionName
        )
      );
    });
}

function outageSourceEditorHtml({
  name = "",
  sources = []
} = {}) {
  const availableSourceLabels =
    Array.isArray(outageConfigCatalog.availableSourceLabels)
      ? outageConfigCatalog.availableSourceLabels
      : [];

  const sourceOptions =
    availableSourceLabels
      .map(
        (label) => `
          <option value="${escapeHtml(label)}">
            ${escapeHtml(label)}
          </option>
        `
      )
      .join("");

  return `
    <label class="management-field">
      <span>Название подразделения</span>
      <input
        id="outageDivisionNameInput"
        maxlength="80"
        value="${escapeHtml(name)}"
        placeholder="Например: ВЭС"
      />
    </label>

    <div class="management-note">
      Каждая выбранная строка соответствует роли/строке подразделения из сводок
      «СК-11 OMS • Аварийные отключения» или «Плановые отключения». Одна и та же
      настройка применяется к обоим чатам, а несколько строк суммируются в один счётчик.
    </div>

    ${
      availableSourceLabels.length
        ? `
          <div class="dispatcher-source-picker">
            <label class="management-field">
              <span>Добавить строку из последнего сообщения</span>
              <select id="outageSourceSuggestion" class="dispatcher-select">
                ${sourceOptions}
              </select>
            </label>
            <button id="outageAddSourceButton" class="role-action" type="button">
              + Добавить
            </button>
          </div>
        `
        : `
          <div class="management-note is-warning">
            Пока строки из сообщения не получены. Проверьте OUTAGES_CHAT_ID
            и наличие свежего сообщения «СК-11 OMS • Аварийные отключения».
          </div>
        `
    }

    <label class="management-field dispatcher-source-editor-field">
      <span>Строки-источники · по одной на строку</span>
      <textarea
        id="outageSourcesTextarea"
        rows="10"
        placeholder="Например:\nВыборгский РЭС\nПриозерский РЭС"
      >${escapeHtml(sources.join("\n"))}</textarea>
    </label>
  `;
}

function bindOutageSourcePicker() {
  document.getElementById(
    "outageAddSourceButton"
  )?.addEventListener(
    "click",
    () => {
      const select =
        document.getElementById(
          "outageSourceSuggestion"
        );
      const textarea =
        document.getElementById(
          "outageSourcesTextarea"
        );

      const value =
        String(select?.value || "").trim();

      if (!value || !textarea) return;

      const current =
        String(textarea.value || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);

      if (!current.includes(value)) {
        current.push(value);
      }

      textarea.value = current.join("\n");
      textarea.focus();
    }
  );
}

function openCreateOutageDivisionEditor() {
  if (!currentUser?.isDeveloper) return;

  openManagementModal({
    eyebrow: "АКТИВНЫЕ ОТКЛЮЧЕНИЯ",
    title: "Новое подразделение",
    saveLabel: "Создать подразделение",
    context: {
      type: "outage-division-create"
    },
    bodyHtml: outageSourceEditorHtml()
  });

  bindOutageSourcePicker();
  document.getElementById(
    "outageDivisionNameInput"
  )?.focus();
}

function openOutageDivisionEditor(divisionId) {
  const division =
    outageConfigCatalog.divisions.find(
      (item) => item.id === divisionId
    );

  if (!division) return;

  openManagementModal({
    eyebrow: "АКТИВНЫЕ ОТКЛЮЧЕНИЯ",
    title: `Настройка · ${division.name}`,
    context: {
      type: "outage-division-edit",
      divisionId: division.id
    },
    bodyHtml: outageSourceEditorHtml({
      name: division.name,
      sources:
        Array.isArray(division.sources)
          ? division.sources
          : []
    })
  });

  bindOutageSourcePicker();
}

async function postOutageConfigAction(payload) {
  const response = await fetch(
    API_ADMIN_OUTAGE_CONFIG,
    {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getSessionHeaders()
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error ||
      "Не удалось изменить настройки активных отключений"
    );
  }

  return data;
}

async function deleteOutageDivisionFromAdmin(
  divisionId,
  divisionName
) {
  const confirmed = window.confirm(
    `Удалить подразделение «${divisionName}» из активных отключений?`
  );

  if (!confirmed) return;

  try {
    await postOutageConfigAction({
      action: "delete",
      divisionId
    });

    await loadOutageConfigManagement();
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow: "АКТИВНЫЕ ОТКЛЮЧЕНИЯ",
      title: "Не удалось удалить подразделение",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  }
}

async function loadOutageConfigManagement() {
  if (!currentUser?.isDeveloper) return;

  try {
    const response = await fetch(
      API_ADMIN_OUTAGE_CONFIG,
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: getSessionHeaders()
      }
    );

    const payload = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось загрузить настройки активных отключений"
      );
    }

    outageConfigCatalog = {
      divisions:
        Array.isArray(payload.divisions)
          ? payload.divisions
          : [],
      availableSourceLabels:
        Array.isArray(payload.availableSourceLabels)
          ? payload.availableSourceLabels
          : [],
      unassignedSources: {
        emergency:
          Array.isArray(payload?.unassignedSources?.emergency)
            ? payload.unassignedSources.emergency
            : [],
        planned:
          Array.isArray(payload?.unassignedSources?.planned)
            ? payload.unassignedSources.planned
            : []
      },
      sourceData:
        payload.sourceData || {},
      storageConfigured:
        Boolean(payload.storageConfigured)
    };

    const sourceInfo = outageConfigCatalog.sourceData;
    const outageConfigUpdatedAt = latestSourceUpdate(
      sourceInfo?.sourceUpdatedAt,
      sourceInfo?.plannedSourceUpdatedAt
    );
    const outageConfigUpdateSuffix = outageConfigUpdatedAt
      ? ` Обновлено: ${outageConfigUpdatedAt}.`
      : "";

    outageConfigStatus.textContent =
      outageConfigCatalog.storageConfigured
        ? `Подразделения и роли сохраняются в Redis. Чаты задаются через OUTAGES_CHAT_ID и PLANNED_OUTAGES_CHAT_ID.${outageConfigUpdateSuffix}`
        : `Redis не подключён: изменения сохранить нельзя.${outageConfigUpdateSuffix}`;

    outageConfigStatus.classList.toggle(
      "is-warning",
      !outageConfigCatalog.storageConfigured ||
      (sourceInfo?.status && sourceInfo.status !== "ok")
    );

    renderOutageConfigList();
  } catch (error) {
    outageConfigStatus.textContent =
      error instanceof Error
        ? error.message
        : "Ошибка загрузки активных отключений";
    outageConfigStatus.classList.add("is-warning");
    outageConfigList.innerHTML = "";
  }
}

function dispatcherConfigGroupName(
  groupId
) {
  return (
    dispatcherConfigCatalog.groups.find(
      (group) =>
        group.id === groupId
    )?.name ||
    groupId
  );
}

function getDispatcherOutageSelectionMap(unit) {
  const result = new Map();
  const divisions = Array.isArray(dispatcherConfigCatalog.outageDivisions)
    ? dispatcherConfigCatalog.outageDivisions
    : [];
  const divisionMap = new Map(
    divisions.map((division) => [String(division.id), division])
  );

  if (unit?.outageSelectionMode === "roles") {
    const selections = Array.isArray(unit?.outageSelections)
      ? unit.outageSelections
      : [];

    for (const selection of selections) {
      const divisionId = String(selection?.divisionId || "");
      if (!divisionId) continue;
      result.set(
        divisionId,
        new Set(
          (Array.isArray(selection?.sources) ? selection.sources : [])
            .map((source) => String(source || "").trim())
            .filter(Boolean)
        )
      );
    }

    return result;
  }

  const legacyDivisionIds = Array.isArray(unit?.outageDivisionIds)
    ? unit.outageDivisionIds
    : [];

  for (const divisionId of legacyDivisionIds) {
    const division = divisionMap.get(String(divisionId));
    result.set(
      String(divisionId),
      new Set(
        (Array.isArray(division?.sources) ? division.sources : [])
          .map((source) => String(source || "").trim())
          .filter(Boolean)
      )
    );
  }

  return result;
}

function renderDispatcherConfigList() {
  const selectedGroupId =
    dispatcherConfigGroupSelect.value ||
    dispatcherConfigCatalog.groups[0]?.id ||
    "";

  const units =
    dispatcherConfigCatalog.units.filter(
      (unit) =>
        unit.groupId === selectedGroupId
    );

  dispatcherCreateUnitButton.disabled =
    !selectedGroupId ||
    !dispatcherConfigCatalog.storageConfigured;

  dispatcherDeleteGroupButton.disabled =
    !selectedGroupId ||
    !dispatcherConfigCatalog.storageConfigured;

  if (!units.length) {
    dispatcherConfigList.innerHTML = `
      <div class="access-empty dispatcher-structure-empty">
        <strong>В подразделении пока нет РЭС / районов</strong>
        <span>
          Нажмите «+ РЭС / район», чтобы добавить первый элемент.
        </span>
      </div>
    `;
    return;
  }

  dispatcherConfigList.innerHTML =
    units.map(
      (unit) => {
        const sources =
          Array.isArray(unit.sources)
            ? unit.sources
            : [];
        const outageSelectionMap =
          getDispatcherOutageSelectionMap(unit);
        const outageSelectionSummaries =
          [...outageSelectionMap.entries()]
            .map(([divisionId, selectedRoles]) => {
              const division =
                dispatcherConfigCatalog.outageDivisions.find(
                  (item) => item.id === divisionId
                );

              if (!division) {
                return {
                  name: divisionId,
                  roleCount: selectedRoles.size
                };
              }

              return {
                name: division.name,
                roleCount: selectedRoles.size
              };
            });

        return `
          <article class="dispatcher-config-card">
            <div class="dispatcher-config-card-head">
              <div>
                <span class="micro-label">
                  ${escapeHtml(
                    dispatcherConfigGroupName(
                      unit.groupId
                    )
                  )}
                </span>
                <h3>${escapeHtml(unit.name)}</h3>
              </div>

              <span class="dispatcher-config-state ${unit.customized ? "is-custom" : ""}">
                ${unit.customized ? "ИЗМЕНЕНО" : unit.builtin ? "ПО УМОЛЧАНИЮ" : "НОВЫЙ"}
              </span>
            </div>

            <div class="dispatcher-config-section-label">Заявки СК-11</div>
            <div class="dispatcher-config-sources">
              ${
                sources.length
                  ? sources
                      .map(
                        (source) => `
                          <span>${escapeHtml(source)}</span>
                        `
                      )
                      .join("")
                  : `
                    <span class="is-empty">
                      Источники заявок отключены · счётчики будут по нулям
                    </span>
                  `
              }
            </div>

            <div class="dispatcher-config-section-label is-outages">Активные отключения</div>
            <div class="dispatcher-config-sources dispatcher-config-outage-sources">
              ${
                outageSelectionSummaries.length
                  ? outageSelectionSummaries
                      .map(
                        (selection) => `
                          <span title="Выбрано ролей: ${Number(selection.roleCount || 0)}">
                            ${escapeHtml(selection.name)} · ${Number(selection.roleCount || 0)} ${pluralizeRu(Number(selection.roleCount || 0), "роль", "роли", "ролей")}
                          </span>
                        `
                      )
                      .join("")
                  : `
                    <span class="is-empty">
                      Подразделения и роли отключений не выбраны · аварийные и плановые будут по нулям
                    </span>
                  `
              }
            </div>

            <div class="dispatcher-config-card-actions">
              <button
                class="role-action dispatcher-config-edit"
                type="button"
                data-dispatcher-unit="${escapeHtml(unit.id)}"
              >
                Настроить источники
              </button>

              <button
                class="role-action dispatcher-config-edit dispatcher-outage-config-edit"
                type="button"
                data-dispatcher-outages-unit="${escapeHtml(unit.id)}"
              >
                Настроить отключения
              </button>

              <button
                class="role-action is-danger"
                type="button"
                data-delete-dispatcher-unit="${escapeHtml(unit.id)}"
                data-delete-dispatcher-unit-name="${escapeHtml(unit.name)}"
              >
                Удалить
              </button>
            </div>
          </article>
        `;
      }
    ).join("");

  dispatcherConfigList
    .querySelectorAll(
      "[data-dispatcher-unit]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            openDispatcherSourceEditor(
              button.dataset
                .dispatcherUnit
            )
        );
      }
    );

  dispatcherConfigList
    .querySelectorAll(
      "[data-dispatcher-outages-unit]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            openDispatcherOutageSourceEditor(
              button.dataset
                .dispatcherOutagesUnit
            )
        );
      }
    );

  dispatcherConfigList
    .querySelectorAll(
      "[data-delete-dispatcher-unit]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            deleteDispatcherUnitFromAdmin(
              button.dataset
                .deleteDispatcherUnit,
              button.dataset
                .deleteDispatcherUnitName
            )
        );
      }
    );
}

function renderDispatcherConfigGroups() {
  const groups =
    dispatcherConfigCatalog.groups || [];

  const oldValue =
    dispatcherConfigGroupSelect.value;

  dispatcherConfigGroupSelect.innerHTML =
    groups.length
      ? groups.map(
          (group) => `
            <option value="${escapeHtml(group.id)}">
              ${escapeHtml(group.name)}${group.description ? ` — ${escapeHtml(group.description)}` : ""}
            </option>
          `
        ).join("")
      : `<option value="">Нет подразделений</option>`;

  if (
    groups.some(
      (group) =>
        group.id === oldValue
    )
  ) {
    dispatcherConfigGroupSelect.value =
      oldValue;
  }

  const hasGroups =
    groups.length > 0;

  dispatcherConfigGroupSelect.disabled =
    !hasGroups;
  dispatcherCreateGroupButton.disabled =
    !dispatcherConfigCatalog.storageConfigured;
  dispatcherCreateUnitButton.disabled =
    !hasGroups ||
    !dispatcherConfigCatalog.storageConfigured;
  dispatcherEditGroupButton.disabled =
    !hasGroups ||
    !dispatcherConfigCatalog.storageConfigured;
  dispatcherDeleteGroupButton.disabled =
    !hasGroups ||
    !dispatcherConfigCatalog.storageConfigured;

  renderDispatcherConfigList();
}


function renderDispatcherWorkordersConfigList() {
  const selectedGroupId =
    dispatcherWorkordersConfigGroupSelect.value ||
    dispatcherWorkordersConfigCatalog.groups[0]?.id ||
    "";

  const units =
    dispatcherWorkordersConfigCatalog.units.filter(
      (unit) =>
        unit.groupId === selectedGroupId
    );

  if (!units.length) {
    dispatcherWorkordersConfigList.innerHTML = `
      <div class="access-empty dispatcher-structure-empty">
        <strong>В подразделении пока нет РЭС / районов</strong>
        <span>
          Структура синхронизируется с основным блоком настройки диспетчера выше.
        </span>
      </div>
    `;
    return;
  }

  dispatcherWorkordersConfigList.innerHTML =
    units.map(
      (unit) => {
        const sources =
          Array.isArray(unit.sources)
            ? unit.sources
            : [];

        return `
          <article class="dispatcher-config-card dispatcher-workorders-config-card">
            <div class="dispatcher-config-card-head">
              <div>
                <span class="micro-label">
                  ${escapeHtml(
                    dispatcherConfigGroupName(
                      unit.groupId
                    )
                  )}
                </span>
                <h3>${escapeHtml(unit.name)}</h3>
              </div>

              <span class="dispatcher-config-state ${unit.customized ? "is-custom" : ""}">
                ${unit.customized ? "НАСТРОЕНО" : "НЕ НАСТРОЕНО"}
              </span>
            </div>

            <div class="dispatcher-config-sources">
              ${
                sources.length
                  ? sources
                      .map(
                        (source) => `
                          <span>${escapeHtml(source)}</span>
                        `
                      )
                      .join("")
                  : `
                    <span class="is-empty">
                      Источники НДР не выбраны · диаграмма будет по нулям
                    </span>
                  `
              }
            </div>

            <div class="dispatcher-config-card-actions">
              <button
                class="role-action dispatcher-config-edit"
                type="button"
                data-workorders-unit="${escapeHtml(unit.id)}"
              >
                Настроить НДР
              </button>
            </div>
          </article>
        `;
      }
    ).join("");

  dispatcherWorkordersConfigList
    .querySelectorAll(
      "[data-workorders-unit]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            openDispatcherWorkordersSourceEditor(
              button.dataset
                .workordersUnit
            )
        );
      }
    );
}

function renderDispatcherWorkordersConfigGroups() {
  const groups =
    dispatcherWorkordersConfigCatalog.groups || [];

  const oldValue =
    dispatcherWorkordersConfigGroupSelect.value;

  dispatcherWorkordersConfigGroupSelect.innerHTML =
    groups.length
      ? groups.map(
          (group) => `
            <option value="${escapeHtml(group.id)}">
              ${escapeHtml(group.name)}${group.description ? ` — ${escapeHtml(group.description)}` : ""}
            </option>
          `
        ).join("")
      : `<option value="">Нет подразделений</option>`;

  if (
    groups.some(
      (group) =>
        group.id === oldValue
    )
  ) {
    dispatcherWorkordersConfigGroupSelect.value =
      oldValue;
  }

  dispatcherWorkordersConfigGroupSelect.disabled =
    !groups.length;

  renderDispatcherWorkordersConfigList();
}

function openDispatcherWorkordersSourceEditor(
  unitId
) {
  const unit =
    dispatcherWorkordersConfigCatalog.units.find(
      (item) =>
        item.id === unitId
    );

  if (!unit) {
    return;
  }

  const sources =
    Array.isArray(unit.sources)
      ? unit.sources
      : [];

  const availableSourceLabels =
    Array.isArray(
      dispatcherWorkordersConfigCatalog.availableSourceLabels
    )
      ? dispatcherWorkordersConfigCatalog.availableSourceLabels
      : [];

  const sourceOptions =
    availableSourceLabels
      .map(
        (label) => `
          <option value="${escapeHtml(label)}">
            ${escapeHtml(label)}
          </option>
        `
      )
      .join("");

  openManagementModal({
    eyebrow:
      "НАРЯДЫ / РАСПОРЯЖЕНИЯ / ДОПУСКИ",
    title:
      `${dispatcherConfigGroupName(unit.groupId)} · ${unit.name}`,
    context: {
      type:
        "dispatcher-workorders-source",
      unitId:
        unit.id
    },
    bodyHtml: `
      <div class="management-note">
        Выберите строки журналов из последнего сообщения «СК-11 • Наряды / допуски».
        Если добавить несколько строк, их статусы суммируются. В интерфейсе диспетчера
        по умолчанию будет показана общая сумма, а каждую строку можно открыть отдельно.
      </div>

      ${
        availableSourceLabels.length
          ? `
            <div class="dispatcher-source-picker">
              <label class="management-field">
                <span>Быстро добавить журнал из последнего СК-11</span>
                <select id="dispatcherWorkordersSourceSuggestion" class="dispatcher-select">
                  ${sourceOptions}
                </select>
              </label>
              <button id="dispatcherWorkordersAddSourceButton" class="role-action" type="button">
                + Добавить
              </button>
            </div>
          `
          : `
            <div class="management-note is-warning">
              Пока нет распознанных строк НДР. Проверьте DISPATCHER_WORKORDERS_CHAT_ID
              и наличие свежего сообщения в чате MAX.
            </div>
          `
      }

      <label class="management-field dispatcher-source-editor-field">
        <span>Журналы-источники · по одному на строку</span>
        <textarea
          id="dispatcherWorkordersSourcesTextarea"
          rows="10"
          placeholder="Например:\nВЭС. Журнал учета работ по НДР. Выборгский РЭС"
        >${escapeHtml(sources.join("\n"))}</textarea>
      </label>

      <div class="dispatcher-source-defaults">
        <span>Если оставить поле пустым:</span>
        <strong>все значения НДР для этого РЭС / района будут равны нулю</strong>
      </div>
    `
  });

  document.getElementById(
    "dispatcherWorkordersAddSourceButton"
  )?.addEventListener(
    "click",
    () => {
      const select =
        document.getElementById(
          "dispatcherWorkordersSourceSuggestion"
        );
      const textarea =
        document.getElementById(
          "dispatcherWorkordersSourcesTextarea"
        );

      const value =
        String(select?.value || "")
          .trim();

      if (!value || !textarea) {
        return;
      }

      const current =
        String(textarea.value || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);

      if (!current.includes(value)) {
        current.push(value);
      }

      textarea.value =
        current.join("\n");
      textarea.focus();
    }
  );
}


function executiveSummarySourceName(type, id) {
  const clean = String(id || "").trim();
  if (!clean) return "—";

  if (type === "outages") {
    return executiveTableConfigCatalog.outageDivisions.find(
      (item) => String(item?.id || "") === clean
    )?.name || clean;
  }

  return executiveTableConfigCatalog.groups.find(
    (item) => String(item?.id || "") === clean
  )?.name || clean;
}

function renderExecutiveSummarySources(ids, type, emptyText) {
  const list = Array.isArray(ids) ? ids : [];
  if (!list.length) {
    return `<span class="is-empty">${escapeHtml(emptyText)}</span>`;
  }

  return list.map((id) => `
    <span>${escapeHtml(executiveSummarySourceName(type, id))}</span>
  `).join("");
}

function renderExecutiveTableConfigList() {
  if (!executiveTableConfigList) return;

  const rows = Array.isArray(executiveTableConfigCatalog.rows)
    ? executiveTableConfigCatalog.rows
    : [];

  if (executiveTableCreateButton) {
    executiveTableCreateButton.disabled =
      !executiveTableConfigCatalog.storageConfigured;
  }

  if (!rows.length) {
    executiveTableConfigList.innerHTML = `
      <div class="access-empty dispatcher-structure-empty">
        <strong>Используется автоматическая таблица</strong>
        <span>
          Создайте первое сводное подразделение, чтобы самостоятельно
          определить источники для каждой строки таблицы.
        </span>
      </div>
    `;
    return;
  }

  executiveTableConfigList.innerHTML = rows.map((row) => `
    <article class="dispatcher-config-card executive-table-config-card">
      <div class="dispatcher-config-card-head">
        <div>
          <span class="micro-label">СВОДНОЕ ПОДРАЗДЕЛЕНИЕ</span>
          <h3>${escapeHtml(row?.name || "—")}</h3>
          ${row?.description ? `<p class="executive-config-description">${escapeHtml(row.description)}</p>` : ""}
        </div>
        <span class="dispatcher-config-state is-custom">НАСТРОЕНО</span>
      </div>

      <div class="executive-config-source-grid">
        <section>
          <div class="dispatcher-config-section-label is-outages">Отключения / обращения</div>
          <div class="dispatcher-config-sources">
            ${renderExecutiveSummarySources(row?.outageDivisionIds, "outages", "Источники не выбраны")}
          </div>
        </section>

        <section>
          <div class="dispatcher-config-section-label">Заявки</div>
          <div class="dispatcher-config-sources">
            ${renderExecutiveSummarySources(row?.requestGroupIds, "groups", "Источники не выбраны")}
          </div>
        </section>

        <section>
          <div class="dispatcher-config-section-label">НДР</div>
          <div class="dispatcher-config-sources">
            ${renderExecutiveSummarySources(row?.workorderGroupIds, "groups", "Источники не выбраны")}
          </div>
        </section>

        <section>
          <div class="dispatcher-config-section-label">РЭС / районы</div>
          <div class="dispatcher-config-sources">
            ${renderExecutiveSummarySources(row?.unitGroupIds, "groups", "Если пусто — используются группы заявок и НДР")}
          </div>
        </section>
      </div>

      <div class="dispatcher-config-card-actions">
        <button
          class="role-action dispatcher-config-edit"
          type="button"
          data-executive-row-edit="${escapeHtml(row?.id || "")}"
        >
          Настроить
        </button>
        <button
          class="role-action is-danger"
          type="button"
          data-executive-row-delete="${escapeHtml(row?.id || "")}"
          data-executive-row-name="${escapeHtml(row?.name || "")}" 
        >
          Удалить
        </button>
      </div>
    </article>
  `).join("");

  executiveTableConfigList
    .querySelectorAll("[data-executive-row-edit]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        openExecutiveTableRowEditor(button.dataset.executiveRowEdit);
      });
    });

  executiveTableConfigList
    .querySelectorAll("[data-executive-row-delete]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        deleteExecutiveTableRowFromAdmin(
          button.dataset.executiveRowDelete,
          button.dataset.executiveRowName
        );
      });
    });
}

function executiveSourceCheckboxes(items, selectedIds, inputName, emptyText) {
  const list = Array.isArray(items) ? items : [];
  const selected = new Set(Array.isArray(selectedIds) ? selectedIds : []);

  if (!list.length) {
    return `<div class="management-note is-warning">${escapeHtml(emptyText)}</div>`;
  }

  return `
    <div class="permission-grid executive-source-picker">
      ${list.map((item) => `
        <label class="permission-option">
          <input
            type="checkbox"
            name="${escapeHtml(inputName)}"
            value="${escapeHtml(item?.id || "")}"
            ${selected.has(String(item?.id || "")) ? "checked" : ""}
          />
          <span>
            <strong>${escapeHtml(item?.name || item?.id || "—")}</strong>
            ${item?.description ? `<small>${escapeHtml(item.description)}</small>` : ""}
          </span>
        </label>
      `).join("")}
    </div>
  `;
}

function executiveMapSourceName(id, type) {
  const clean = String(id || "").trim();
  if (!clean) return "—";

  if (type === "outages") {
    return executiveMapConfigCatalog.outageDivisions.find(
      (item) => String(item?.id || "") === clean
    )?.name || clean;
  }

  const unit = executiveMapConfigCatalog.units.find(
    (item) => String(item?.id || "") === clean
  );
  if (!unit) return clean;
  const group = executiveMapConfigCatalog.groups.find(
    (item) => String(item?.id || "") === String(unit?.groupId || "")
  );
  return group?.name ? `${group.name} · ${unit.name}` : (unit.name || clean);
}

function renderExecutiveMapSourceTags(ids, type, emptyText) {
  const list = Array.isArray(ids) ? ids : [];
  if (!list.length) {
    return `<span class="is-empty">${escapeHtml(emptyText)}</span>`;
  }
  return list.map((id) => `<span>${escapeHtml(executiveMapSourceName(id, type))}</span>`).join("");
}

function renderExecutiveMapConfigList() {
  if (!executiveMapConfigList) return;
  const zones = Array.isArray(executiveMapConfigCatalog.zones)
    ? executiveMapConfigCatalog.zones
    : [];

  if (!zones.length) {
    executiveMapConfigList.innerHTML = `
      <div class="access-empty dispatcher-structure-empty">
        <strong>Регионы карты не загружены</strong>
        <span>Обновите страницу или проверьте конфигурацию сервера.</span>
      </div>
    `;
    return;
  }

  executiveMapConfigList.innerHTML = zones.map((zone) => `
    <article class="dispatcher-config-card executive-map-config-card ${zone?.enabled === false ? "is-disabled" : ""}">
      <div class="dispatcher-config-card-head">
        <div>
          <span class="micro-label">ГЕОГРАФИЧЕСКИЙ РЕГИОН</span>
          <h3>${escapeHtml(zone?.name || "—")}</h3>
        </div>
        <span class="executive-map-config-state ${zone?.enabled === false ? "is-off" : "is-on"}">
          ${zone?.enabled === false ? "СКРЫТ" : "НА КАРТЕ"}
        </span>
      </div>

      <div class="executive-config-source-grid executive-map-source-grid">
        <section>
          <strong>Подразделения отключений</strong>
          <div class="executive-config-source-tags">
            ${renderExecutiveMapSourceTags(zone?.outageDivisionIds, "outages", "Не выбраны")}
          </div>
        </section>
        <section>
          <strong>РЭС / районы / ВВР</strong>
          <div class="executive-config-source-tags">
            ${renderExecutiveMapSourceTags(zone?.unitIds, "units", "Не выбраны")}
          </div>
        </section>
      </div>

      <div class="dispatcher-config-card-actions">
        <button class="role-action" type="button" data-executive-map-edit="${escapeHtml(zone?.id || "")}">
          Настроить регион
        </button>
      </div>
    </article>
  `).join("");

  executiveMapConfigList.querySelectorAll("[data-executive-map-edit]").forEach((button) => {
    button.addEventListener("click", () => openExecutiveMapZoneEditor(button.dataset.executiveMapEdit || ""));
  });
}

function executiveMapUnitCheckboxes(selectedIds = []) {
  const selected = new Set((Array.isArray(selectedIds) ? selectedIds : []).map(String));
  const groups = Array.isArray(executiveMapConfigCatalog.groups) ? executiveMapConfigCatalog.groups : [];
  const units = Array.isArray(executiveMapConfigCatalog.units) ? executiveMapConfigCatalog.units : [];

  if (!units.length) {
    return `<div class="access-empty"><span>РЭС / районы пока не настроены.</span></div>`;
  }

  return `<div class="executive-map-unit-picker">${groups.map((group) => {
    const groupUnits = units.filter((unit) => String(unit?.groupId || "") === String(group?.id || ""));
    if (!groupUnits.length) return "";
    return `
      <section class="executive-map-unit-group">
        <strong>${escapeHtml(group?.name || "Подразделение")}</strong>
        <div class="permission-grid executive-source-picker">
          ${groupUnits.map((unit) => `
            <label class="permission-option">
              <input
                type="checkbox"
                name="executiveMapUnit"
                value="${escapeHtml(unit?.id || "")}"
                ${selected.has(String(unit?.id || "")) ? "checked" : ""}
              />
              <span>${escapeHtml(unit?.name || unit?.id || "РЭС / район")}</span>
            </label>
          `).join("")}
        </div>
      </section>
    `;
  }).join("")}</div>`;
}

function openExecutiveMapZoneEditor(zoneId = "") {
  if (!currentUser?.isDeveloper) return;
  const id = String(zoneId || "").trim();
  const zone = executiveMapConfigCatalog.zones.find((item) => String(item?.id || "") === id);
  if (!zone) return;

  openManagementModal({
    eyebrow: "РУКОВОДЯЩИЙ КОНТУР · ОПЕРАТИВНАЯ КАРТА",
    title: `Регион · ${zone.name || zone.id}`,
    saveLabel: "Сохранить регион",
    context: {
      type: "executive-map-zone-edit",
      zoneId: zone.id
    },
    bodyHtml: `
      <label class="permission-option executive-map-enabled-option">
        <input id="executiveMapZoneEnabled" type="checkbox" ${zone?.enabled === false ? "" : "checked"} />
        <span>Показывать этот регион на оперативной карте</span>
      </label>

      <div class="executive-source-editor-section">
        <div class="management-section-head">
          <strong>Подразделения активных отключений</strong>
          <small>Если выбрать подразделение целиком, карта берёт его полный счётчик отключений и обращений.</small>
        </div>
        ${executiveSourceCheckboxes(
          executiveMapConfigCatalog.outageDivisions,
          zone?.outageDivisionIds,
          "executiveMapOutageDivision",
          "Подразделения активных отключений пока не настроены."
        )}
      </div>

      <div class="executive-source-editor-section">
        <div class="management-section-head">
          <strong>Конкретные РЭС / районы / ВВР</strong>
          <small>Используйте для точной географической привязки. Например, ВВР из ОС можно собрать в регион «Санкт-Петербург». РЭС из подразделения, уже выбранного целиком выше, повторно не суммируются.</small>
        </div>
        ${executiveMapUnitCheckboxes(zone?.unitIds)}
      </div>
    `
  });
}

function openExecutiveTableRowEditor(rowId = "") {
  if (!currentUser?.isDeveloper) return;

  const id = String(rowId || "").trim();
  const row = id
    ? executiveTableConfigCatalog.rows.find((item) => item.id === id)
    : null;
  const editing = Boolean(row);

  openManagementModal({
    eyebrow: "РУКОВОДЯЩИЙ КОНТУР · СВОДНАЯ ТАБЛИЦА",
    title: editing
      ? `Настройка · ${row.name}`
      : "Новое сводное подразделение",
    saveLabel: editing ? "Сохранить строку" : "Создать строку",
    context: {
      type: editing ? "executive-table-row-edit" : "executive-table-row-create",
      rowId: row?.id || ""
    },
    bodyHtml: `
      <label class="management-field">
        <span>Название строки</span>
        <input
          id="executiveRowNameInput"
          maxlength="80"
          value="${escapeHtml(row?.name || "")}"
          placeholder="Например: ВЭС"
        />
      </label>

      <label class="management-field">
        <span>Подпись / описание</span>
        <input
          id="executiveRowDescriptionInput"
          maxlength="180"
          value="${escapeHtml(row?.description || "")}"
          placeholder="Например: Выборгские электрические сети"
        />
      </label>

      <div class="executive-source-editor-section">
        <div class="management-section-head">
          <strong>Отключения и обращения</strong>
          <small>Выбираются подразделения из настройки активных отключений.</small>
        </div>
        ${executiveSourceCheckboxes(
          executiveTableConfigCatalog.outageDivisions,
          row?.outageDivisionIds,
          "executiveOutageDivision",
          "Сначала создайте подразделения активных отключений."
        )}
      </div>

      <div class="executive-source-editor-section">
        <div class="management-section-head">
          <strong>Заявки</strong>
          <small>Суммируются заявки всех РЭС / районов выбранных диспетчерских подразделений.</small>
        </div>
        ${executiveSourceCheckboxes(
          executiveTableConfigCatalog.groups,
          row?.requestGroupIds,
          "executiveRequestGroup",
          "Диспетчерские подразделения пока не настроены."
        )}
      </div>

      <div class="executive-source-editor-section">
        <div class="management-section-head">
          <strong>НДР</strong>
          <small>Суммируются наряды / распоряжения выбранных подразделений.</small>
        </div>
        ${executiveSourceCheckboxes(
          executiveTableConfigCatalog.groups,
          row?.workorderGroupIds,
          "executiveWorkorderGroup",
          "Диспетчерские подразделения пока не настроены."
        )}
      </div>

      <div class="executive-source-editor-section">
        <div class="management-section-head">
          <strong>РЭС / районы</strong>
          <small>Определяет число в последнем столбце. Если ничего не выбрать, используются группы заявок и НДР.</small>
        </div>
        ${executiveSourceCheckboxes(
          executiveTableConfigCatalog.groups,
          row?.unitGroupIds,
          "executiveUnitGroup",
          "Диспетчерские подразделения пока не настроены."
        )}
      </div>
    `
  });

  document.getElementById("executiveRowNameInput")?.focus();
}

function selectedExecutiveEditorIds(name) {
  return [...managementBody.querySelectorAll(`input[name="${name}"]:checked`)]
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);
}

async function deleteExecutiveTableRowFromAdmin(rowId, rowName) {
  if (!rowId) return;

  const confirmed = window.confirm(
    `Удалить сводную строку «${rowName || rowId}»? После удаления она исчезнет из таблицы руководящего мониторинга.`
  );

  if (!confirmed) return;

  try {
    await postDispatcherStructureAction({
      action: "delete_executive_row",
      rowId
    });
    await loadDispatcherConfigManagement();
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow: "СВОДНАЯ ТАБЛИЦА",
      title: "Не удалось удалить строку",
      message: error instanceof Error ? error.message : "Попробуйте ещё раз."
    });
  }
}

async function loadDispatcherConfigManagement() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  try {
    const response =
      await fetch(
        API_ADMIN_DISPATCHER_CONFIG,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers:
            getSessionHeaders()
        }
      );

    const payload =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось загрузить источники СК-11"
      );
    }

    dispatcherConfigCatalog = {
      groups:
        Array.isArray(payload.groups)
          ? payload.groups
          : [],
      units:
        Array.isArray(payload.units)
          ? payload.units
          : [],
      availableSourceLabels:
        Array.isArray(
          payload.availableSourceLabels
        )
          ? payload.availableSourceLabels
          : [],
      outageDivisions:
        Array.isArray(payload?.outages?.divisions)
          ? payload.outages.divisions
          : [],
      outageSourceData: {
        emergency: payload?.outages?.emergencySourceData || {},
        planned: payload?.outages?.plannedSourceData || {}
      },
      sourceData:
        payload.sourceData || {},
      storageConfigured:
        Boolean(payload.storageConfigured)
    };

    dispatcherHierarchyConfigCatalog = {
      groups:
        Array.isArray(payload.groups)
          ? payload.groups
          : [],
      units:
        Array.isArray(payload?.dispatcherHierarchy?.units)
          ? payload.dispatcherHierarchy.units
          : [],
      roleCatalog:
        Array.isArray(payload?.dispatcherHierarchy?.roleCatalog)
          ? payload.dispatcherHierarchy.roleCatalog
          : [],
      personnel: payload?.dispatcherHierarchy?.personnel || {},
      storageConfigured:
        Boolean(payload.storageConfigured)
    };

    if (dispatcherPersonnelChatIdInput) {
      dispatcherPersonnelChatIdInput.value =
        String(dispatcherHierarchyConfigCatalog.personnel?.chatId || "");
    }

    if (dispatcherPersonnelSourceStatus) {
      const personnel = dispatcherHierarchyConfigCatalog.personnel || {};
      const details = personnel?.configured
        ? `Последняя полная волна: ${personnel.sourceUpdatedAt || "—"}. Назначений: ${Number(personnel.assignmentCount || 0)}${personnel.employees !== null && personnel.employees !== undefined ? ` · сотрудников: ${Number(personnel.employees || 0)}` : ""}.`
        : (personnel?.message || "ID чата пока не указан");
      dispatcherPersonnelSourceStatus.textContent = details;
      dispatcherPersonnelSourceStatus.classList.toggle(
        "is-warning",
        !personnel?.configured || ["error", "stale", "waiting_parts"].includes(personnel?.status)
      );
    }

    executiveTableConfigCatalog = {
      rows:
        Array.isArray(payload?.executiveTable?.rows)
          ? payload.executiveTable.rows
          : [],
      groups:
        Array.isArray(payload.groups)
          ? payload.groups
          : [],
      outageDivisions:
        Array.isArray(payload?.outages?.divisions)
          ? payload.outages.divisions
          : [],
      storageConfigured:
        Boolean(payload.storageConfigured)
    };

    executiveMapConfigCatalog = {
      zones:
        Array.isArray(payload?.executiveMap?.zones)
          ? payload.executiveMap.zones
          : [],
      groups:
        Array.isArray(payload.groups)
          ? payload.groups
          : [],
      units:
        Array.isArray(payload.units)
          ? payload.units
          : [],
      outageDivisions:
        Array.isArray(payload?.outages?.divisions)
          ? payload.outages.divisions
          : [],
      storageConfigured:
        Boolean(payload.storageConfigured)
    };

    dispatcherWorkordersConfigCatalog = {
      groups:
        Array.isArray(payload.groups)
          ? payload.groups
          : [],
      units:
        Array.isArray(
          payload?.workorders?.units
        )
          ? payload.workorders.units
          : [],
      availableSourceLabels:
        Array.isArray(
          payload?.workorders?.availableSourceLabels
        )
          ? payload.workorders.availableSourceLabels
          : [],
      sourceData:
        payload?.workorders?.sourceData || {},
      storageConfigured:
        Boolean(payload.storageConfigured)
    };

    const sourceInfo =
      dispatcherConfigCatalog.sourceData;

    const outageInfo = dispatcherConfigCatalog.outageSourceData || {};
    const emergencyOutageInfo = outageInfo.emergency || {};
    const plannedOutageInfo = outageInfo.planned || {};
    const dispatcherConfigUpdatedAt = latestSourceUpdate(
      sourceInfo?.sourceUpdatedAt,
      emergencyOutageInfo?.sourceUpdatedAt,
      plannedOutageInfo?.sourceUpdatedAt
    );
    const dispatcherConfigUpdateSuffix = dispatcherConfigUpdatedAt
      ? ` Обновлено: ${dispatcherConfigUpdatedAt}.`
      : "";

    dispatcherConfigStatus.textContent =
      dispatcherConfigCatalog.storageConfigured
        ? `Структура подразделений, РЭС / районов, источники заявок и привязки активных отключений сохраняются в Redis. Отключения настраиваются через подразделения из блока активных отключений.${dispatcherConfigUpdateSuffix}`
        : `Redis не подключён: отображается только базовая структура, изменения сохранить нельзя.${dispatcherConfigUpdateSuffix}`;

    dispatcherConfigStatus.classList.toggle(
      "is-warning",
      !dispatcherConfigCatalog.storageConfigured
    );

    if (dispatcherHierarchyConfigStatus) {
      const configuredHierarchyCount =
        dispatcherHierarchyConfigCatalog.units.filter(
          (unit) => unit?.mainRole
        ).length;
      dispatcherHierarchyConfigStatus.textContent =
        dispatcherHierarchyConfigCatalog.storageConfigured
          ? `Иерархия подготовлена для ${configuredHierarchyCount} ${pluralizeRu(configuredHierarchyCount, "РЭС / района", "РЭС / районов", "РЭС / районов")}. Базовые связи заполнены по предоставленной таблице ролей; каждую запись можно изменить вручную.`
          : "Redis не подключён: используются базовые связи из справочника, пользовательские изменения сохранить нельзя.";
      dispatcherHierarchyConfigStatus.classList.toggle(
        "is-warning",
        !dispatcherHierarchyConfigCatalog.storageConfigured
      );
    }

    executiveTableConfigStatus.textContent =
      executiveTableConfigCatalog.storageConfigured
        ? executiveTableConfigCatalog.rows.length
          ? `Сводная таблица использует пользовательскую конфигурацию: ${executiveTableConfigCatalog.rows.length} ${pluralizeRu(executiveTableConfigCatalog.rows.length, "строка", "строки", "строк")}.`
          : "Пользовательские строки пока не созданы. Таблица автоматически строится по диспетчерским подразделениям."
        : "Redis не подключён: пользовательскую структуру сводной таблицы сохранить нельзя.";

    executiveTableConfigStatus.classList.toggle(
      "is-warning",
      !executiveTableConfigCatalog.storageConfigured
    );

    if (executiveMapConfigStatus) {
      const enabledMapZones = executiveMapConfigCatalog.zones.filter((zone) => zone?.enabled !== false).length;
      executiveMapConfigStatus.textContent =
        executiveMapConfigCatalog.storageConfigured
          ? `Оперативная карта: ${enabledMapZones} ${pluralizeRu(enabledMapZones, "регион включён", "региона включено", "регионов включено")}. Для СПб можно отдельно выбрать ВВР и другие РЭС / районы.`
          : "Redis не подключён: используются базовые привязки карты, изменения сохранить нельзя.";
      executiveMapConfigStatus.classList.toggle(
        "is-warning",
        !executiveMapConfigCatalog.storageConfigured
      );
    }

    const workordersInfo =
      dispatcherWorkordersConfigCatalog.sourceData;

    const workordersSuffix =
      workordersInfo?.sourceUpdatedAt
        ? ` Обновлено: ${workordersInfo.sourceUpdatedAt}.`
        : "";

    dispatcherWorkordersConfigStatus.textContent =
      dispatcherWorkordersConfigCatalog.storageConfigured
        ? `Источники НДР сохраняются отдельно в Redis и привязаны к той же структуре подразделений и РЭС / районов.${workordersSuffix}`
        : `Redis не подключён: источники НДР сохранить нельзя.${workordersSuffix}`;

    dispatcherWorkordersConfigStatus.classList.toggle(
      "is-warning",
      !dispatcherWorkordersConfigCatalog.storageConfigured ||
      (workordersInfo?.status && workordersInfo.status !== "ok")
    );

    renderDispatcherConfigGroups();
    renderDispatcherHierarchyConfigGroups();
    renderExecutiveTableConfigList();
    renderExecutiveMapConfigList();
    renderDispatcherWorkordersConfigGroups();
  } catch (error) {
    dispatcherConfigStatus.textContent =
      error instanceof Error
        ? error.message
        : "Ошибка загрузки источников";

    dispatcherConfigStatus.classList.add(
      "is-warning"
    );

    dispatcherConfigList.innerHTML = "";

    if (dispatcherHierarchyConfigStatus) {
      dispatcherHierarchyConfigStatus.textContent =
        error instanceof Error
          ? error.message
          : "Ошибка загрузки иерархии ролей";
      dispatcherHierarchyConfigStatus.classList.add("is-warning");
    }
    if (dispatcherHierarchyConfigList) {
      dispatcherHierarchyConfigList.innerHTML = "";
    }

    executiveTableConfigStatus.textContent =
      error instanceof Error
        ? error.message
        : "Ошибка загрузки сводных подразделений";
    executiveTableConfigStatus.classList.add("is-warning");
    executiveTableConfigList.innerHTML = "";

    if (executiveMapConfigStatus) {
      executiveMapConfigStatus.textContent =
        error instanceof Error ? error.message : "Ошибка загрузки настройки карты";
      executiveMapConfigStatus.classList.add("is-warning");
    }
    if (executiveMapConfigList) executiveMapConfigList.innerHTML = "";

    dispatcherWorkordersConfigStatus.textContent =
      error instanceof Error
        ? error.message
        : "Ошибка загрузки источников НДР";
    dispatcherWorkordersConfigStatus.classList.add(
      "is-warning"
    );
    dispatcherWorkordersConfigList.innerHTML = "";
  }
}

function renderDispatcherHierarchyConfigList() {
  if (!dispatcherHierarchyConfigList || !dispatcherHierarchyConfigGroupSelect) {
    return;
  }

  const selectedGroupId =
    dispatcherHierarchyConfigGroupSelect.value ||
    dispatcherHierarchyConfigCatalog.groups[0]?.id ||
    "";

  const units = dispatcherHierarchyConfigCatalog.units.filter(
    (unit) => unit.groupId === selectedGroupId
  );

  if (!units.length) {
    dispatcherHierarchyConfigList.innerHTML = `
      <div class="access-empty dispatcher-structure-empty">
        <strong>Для подразделения пока нет РЭС / районов</strong>
        <span>Добавьте РЭС / район в основной настройке диспетчерской структуры.</span>
      </div>
    `;
    return;
  }

  dispatcherHierarchyConfigList.innerHTML = units
    .map((unit) => {
      const subordinateRoles = Array.isArray(unit.subordinateRoles)
        ? unit.subordinateRoles
        : [];
      const preview = subordinateRoles.slice(0, 3);
      const left = Math.max(0, subordinateRoles.length - preview.length);

      return `
        <article class="dispatcher-config-card dispatcher-hierarchy-config-card">
          <div class="dispatcher-config-card-head">
            <div>
              <span class="micro-label">${escapeHtml(dispatcherConfigGroupName(unit.groupId))}</span>
              <h3>${escapeHtml(unit.unitName || "РЭС / район")}</h3>
            </div>
            <span class="dispatcher-config-state ${unit.customized ? "is-custom" : ""}">
              ${unit.customized ? "ИЗМЕНЕНО" : unit.mainRole ? "ИЗ СПРАВОЧНИКА" : "НЕ НАСТРОЕНО"}
            </span>
          </div>

          <div class="dispatcher-hierarchy-admin-main">
            <span>Главная роль</span>
            <strong>${escapeHtml(unit.mainRole || "Не настроена")}</strong>
          </div>

          <div class="dispatcher-config-section-label">Подчинённые роли · ${subordinateRoles.length}</div>
          <div class="dispatcher-config-sources dispatcher-hierarchy-admin-sources">
            ${preview.length
              ? preview.map((role) => `<span>${escapeHtml(role)}</span>`).join("")
              : `<span class="is-empty">Подчинённые роли не настроены</span>`}
            ${left ? `<span class="dispatcher-hierarchy-more">+ ещё ${left}</span>` : ""}
          </div>

          <div class="dispatcher-config-card-actions">
            <button
              class="role-action"
              type="button"
              data-dispatcher-hierarchy-unit="${escapeHtml(unit.unitId)}"
            >
              Настроить подчинение
            </button>
            <button
              class="role-action"
              type="button"
              data-reset-dispatcher-hierarchy="${escapeHtml(unit.unitId)}"
              ${unit.customized && dispatcherHierarchyConfigCatalog.storageConfigured ? "" : "disabled"}
            >
              Сбросить к справочнику
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  dispatcherHierarchyConfigList
    .querySelectorAll("[data-dispatcher-hierarchy-unit]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        openDispatcherHierarchyEditor(button.dataset.dispatcherHierarchyUnit);
      });
    });

  dispatcherHierarchyConfigList
    .querySelectorAll("[data-reset-dispatcher-hierarchy]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const unitId = String(button.dataset.resetDispatcherHierarchy || "").trim();
        if (!unitId) return;

        try {
          await postDispatcherStructureAction({
            action: "reset_role_hierarchy",
            unitId
          });
          await loadDispatcherConfigManagement();
        } catch (error) {
          openModal({
            type: "denied",
            eyebrow: "ИЕРАРХИЯ РОЛЕЙ",
            title: "Не удалось сбросить настройку",
            message: error instanceof Error ? error.message : "Попробуйте ещё раз."
          });
        }
      });
    });
}

function renderDispatcherHierarchyConfigGroups() {
  if (!dispatcherHierarchyConfigGroupSelect) return;

  const groups = dispatcherHierarchyConfigCatalog.groups || [];
  const oldValue = dispatcherHierarchyConfigGroupSelect.value;

  dispatcherHierarchyConfigGroupSelect.innerHTML = groups.length
    ? groups
        .map(
          (group) => `
            <option value="${escapeHtml(group.id)}">
              ${escapeHtml(group.name)}${group.description ? ` — ${escapeHtml(group.description)}` : ""}
            </option>
          `
        )
        .join("")
    : `<option value="">Нет подразделений</option>`;

  if (groups.some((group) => group.id === oldValue)) {
    dispatcherHierarchyConfigGroupSelect.value = oldValue;
  }

  renderDispatcherHierarchyConfigList();
}

function dispatcherHierarchyCatalogEntry(mainRole) {
  const clean = String(mainRole || "").trim();
  return (
    dispatcherHierarchyConfigCatalog.roleCatalog.find(
      (item) => String(item?.mainRole || "").trim() === clean
    ) || null
  );
}

function openDispatcherHierarchyEditor(unitId) {
  const unit = dispatcherHierarchyConfigCatalog.units.find(
    (item) => item.unitId === unitId
  );

  if (!unit) return;

  const roleCatalog = Array.isArray(dispatcherHierarchyConfigCatalog.roleCatalog)
    ? dispatcherHierarchyConfigCatalog.roleCatalog
    : [];

  const datalistOptions = roleCatalog
    .map((item) => `<option value="${escapeHtml(item.mainRole)}"></option>`)
    .join("");

  openManagementModal({
    eyebrow: "ДИСПЕТЧЕР · ИЕРАРХИЯ РОЛЕЙ",
    title: `${dispatcherConfigGroupName(unit.groupId)} · ${unit.unitName}`,
    context: {
      type: "dispatcher-role-hierarchy",
      unitId: unit.unitId
    },
    bodyHtml: `
      <div class="management-note">
        Укажите главную роль выбранного РЭС / района и роли, которые находятся у неё в подчинении.
        Пока сотрудники не подключены, в панели диспетчера рядом с каждой ролью показывается «(ФИО не указано)».
      </div>

      <label class="management-field">
        <span>Главная роль</span>
        <input
          id="dispatcherHierarchyMainRoleInput"
          list="dispatcherHierarchyMainRoleOptions"
          maxlength="180"
          value="${escapeHtml(unit.mainRole || "")}"
          placeholder="Например: Диспетчер ОДГ Выборгского РЭС ВЭС"
        />
        <datalist id="dispatcherHierarchyMainRoleOptions">${datalistOptions}</datalist>
      </label>

      <div class="dispatcher-hierarchy-editor-tools">
        <button id="dispatcherHierarchyApplyCatalogButton" class="role-action" type="button">
          Подставить подчинённых из справочника
        </button>
        <button id="dispatcherHierarchyRestoreDefaultButton" class="role-action" type="button">
          Базовая настройка РЭС
        </button>
      </div>

      <label class="management-field dispatcher-source-editor-field">
        <span>Подчинённые роли · по одной на строку</span>
        <textarea
          id="dispatcherHierarchySubordinatesTextarea"
          rows="12"
          placeholder="ОВБ ВЭС Выборгский РЭС"
        >${escapeHtml((unit.subordinateRoles || []).join("\n"))}</textarea>
      </label>

      <div class="dispatcher-source-defaults">
        <span>Базовая главная роль:</span>
        <strong>${escapeHtml(unit.defaultMainRole || "не задана")}</strong>
      </div>
    `
  });

  const mainInput = document.getElementById("dispatcherHierarchyMainRoleInput");
  const subordinateTextarea = document.getElementById("dispatcherHierarchySubordinatesTextarea");

  document.getElementById("dispatcherHierarchyApplyCatalogButton")?.addEventListener(
    "click",
    () => {
      const entry = dispatcherHierarchyCatalogEntry(mainInput?.value);
      if (!entry || !subordinateTextarea) return;
      subordinateTextarea.value = (entry.subordinateRoles || []).join("\n");
      subordinateTextarea.focus();
    }
  );

  document.getElementById("dispatcherHierarchyRestoreDefaultButton")?.addEventListener(
    "click",
    () => {
      if (mainInput) mainInput.value = unit.defaultMainRole || "";
      if (subordinateTextarea) {
        subordinateTextarea.value = (unit.defaultSubordinateRoles || []).join("\n");
        subordinateTextarea.focus();
      }
    }
  );

  mainInput?.focus();
}

async function postDispatcherStructureAction(
  payload
) {
  const response =
    await fetch(
      API_ADMIN_DISPATCHER_CONFIG,
      {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type":
            "application/json",
          ...getSessionHeaders()
        },
        body: JSON.stringify(payload)
      }
    );

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error ||
      "Не удалось изменить структуру диспетчерского интерфейса"
    );
  }

  return data;
}

function openCreateDispatcherGroupEditor() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  openManagementModal({
    eyebrow:
      "СТРУКТУРА ДИСПЕТЧЕРСКОГО ИНТЕРФЕЙСА",
    title:
      "Новое подразделение",
    saveLabel:
      "Создать подразделение",
    context: {
      type:
        "dispatcher-group-create"
    },
    bodyHtml: `
      <label class="management-field">
        <span>Название подразделения</span>
        <input
          id="dispatcherNewGroupName"
          maxlength="80"
          placeholder="Например: ЗЭС"
        />
      </label>

      <label class="management-field">
        <span>Описание</span>
        <input
          id="dispatcherNewGroupDescription"
          maxlength="160"
          placeholder="Например: Западные электрические сети"
        />
      </label>

      <div class="management-note">
        После создания подразделение автоматически появится в настройках ролей
        и в диспетчерском интерфейсе у Разработчика и ролей с доступом
        «Все подразделения». РЭС / районы добавляются отдельно.
      </div>
    `
  });

  document.getElementById(
    "dispatcherNewGroupName"
  )?.focus();
}

function openEditDispatcherGroupEditor() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  const groupId =
    dispatcherConfigGroupSelect.value;

  const group =
    dispatcherConfigCatalog.groups.find(
      (item) => item.id === groupId
    );

  if (!group) {
    return;
  }

  openManagementModal({
    eyebrow:
      "СТРУКТУРА ДИСПЕТЧЕРСКОГО ИНТЕРФЕЙСА",
    title:
      `Редактирование · ${group.name}`,
    saveLabel:
      "Сохранить изменения",
    context: {
      type:
        "dispatcher-group-edit",
      groupId:
        group.id
    },
    bodyHtml: `
      <label class="management-field">
        <span>Название подразделения</span>
        <input
          id="dispatcherEditGroupName"
          maxlength="80"
          value="${escapeHtml(group.name)}"
          placeholder="Название подразделения"
        />
      </label>

      <label class="management-field">
        <span>Описание</span>
        <input
          id="dispatcherEditGroupDescription"
          maxlength="160"
          value="${escapeHtml(group.description || "")}"
          placeholder="Описание подразделения"
        />
      </label>

      <div class="management-note">
        Внутренний ID подразделения не меняется, поэтому существующие роли,
        РЭС / районы и их источники продолжат работать. Изменится только
        отображаемое название и описание во всём интерфейсе.
      </div>
    `
  });

  document.getElementById(
    "dispatcherEditGroupName"
  )?.focus();
}

function openCreateDispatcherUnitEditor() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  const groups =
    dispatcherConfigCatalog.groups || [];

  if (!groups.length) {
    openModal({
      type: "denied",
      eyebrow: "СТРУКТУРА",
      title: "Сначала создайте подразделение",
      message:
        "Чтобы добавить РЭС / район, в системе должно быть хотя бы одно подразделение."
    });
    return;
  }

  const selectedGroupId =
    dispatcherConfigGroupSelect.value ||
    groups[0]?.id ||
    "";

  const options =
    groups.map(
      (group) => `
        <option
          value="${escapeHtml(group.id)}"
          ${group.id === selectedGroupId ? "selected" : ""}
        >
          ${escapeHtml(group.name)}
        </option>
      `
    ).join("");

  openManagementModal({
    eyebrow:
      "СТРУКТУРА ДИСПЕТЧЕРСКОГО ИНТЕРФЕЙСА",
    title:
      "Новый РЭС / район",
    saveLabel:
      "Создать РЭС / район",
    context: {
      type:
        "dispatcher-unit-create"
    },
    bodyHtml: `
      <label class="management-field">
        <span>Подразделение</span>
        <select
          id="dispatcherNewUnitGroup"
          class="dispatcher-select"
        >
          ${options}
        </select>
      </label>

      <label class="management-field">
        <span>Название РЭС / района</span>
        <input
          id="dispatcherNewUnitName"
          maxlength="80"
          placeholder="Например: Волосовский РЭС"
        />
      </label>

      <div class="management-note">
        Новый РЭС / район создаётся без источников СК-11. После создания
        откройте его карточку и назначьте нужные строки через «Настроить источники».
      </div>
    `
  });

  document.getElementById(
    "dispatcherNewUnitName"
  )?.focus();
}

async function deleteDispatcherUnitFromAdmin(
  unitId,
  unitName
) {
  const confirmed =
    window.confirm(
      `Удалить «${unitName}»? РЭС / район исчезнет из диспетчерского интерфейса. Это разрешено и для элементов, которые были в системе изначально.`
    );

  if (!confirmed) {
    return;
  }

  try {
    await postDispatcherStructureAction({
      action: "delete_unit",
      unitId
    });

    await Promise.all([
      loadDispatcherConfigManagement(),
      loadAccessManagement()
    ]);
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow: "СТРУКТУРА",
      title: "Не удалось удалить РЭС / район",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  }
}

async function deleteSelectedDispatcherGroup() {
  const groupId =
    dispatcherConfigGroupSelect.value;

  const group =
    dispatcherConfigCatalog.groups.find(
      (item) => item.id === groupId
    );

  if (!group) {
    return;
  }

  const unitCount =
    dispatcherConfigCatalog.units.filter(
      (unit) =>
        unit.groupId === group.id
    ).length;

  const confirmed =
    window.confirm(
      `Удалить подразделение «${group.name}»? Вместе с ним из интерфейса будут удалены все его РЭС / районы (${unitCount}). Роли, ограниченные этим подразделением, потеряют диспетчерский контур до перенастройки.`
    );

  if (!confirmed) {
    return;
  }

  try {
    await postDispatcherStructureAction({
      action: "delete_group",
      groupId: group.id
    });

    await Promise.all([
      loadDispatcherConfigManagement(),
      loadAccessManagement(),
      loadAdminDashboard()
    ]);
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow: "СТРУКТУРА",
      title: "Не удалось удалить подразделение",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  }
}

function openDispatcherSourceEditor(
  unitId
) {
  const unit =
    dispatcherConfigCatalog.units.find(
      (item) =>
        item.id === unitId
    );

  if (!unit) {
    return;
  }

  const sources =
    Array.isArray(unit.sources)
      ? unit.sources
      : [];

  const defaults =
    Array.isArray(unit.defaultSources)
      ? unit.defaultSources
      : [];

  const availableSourceLabels =
    Array.isArray(
      dispatcherConfigCatalog.availableSourceLabels
    )
      ? dispatcherConfigCatalog.availableSourceLabels
      : [];

  const sourceOptions =
    availableSourceLabels
      .map(
        (label) => `
          <option value="${escapeHtml(label)}">
            ${escapeHtml(label)}
          </option>
        `
      )
      .join("");

  openManagementModal({
    eyebrow:
      "ИСТОЧНИКИ СК-11",
    title:
      `${dispatcherConfigGroupName(unit.groupId)} · ${unit.name}`,
    context: {
      type:
        "dispatcher-source",
      unitId:
        unit.id
    },
    bodyHtml: `
      <div class="management-note">
        Каждая строка ниже должна точно совпадать с названием строки в сообщении СК-11.
        Все найденные строки суммируются. Можно оставить поле пустым — тогда все счётчики
        этого РЭС/района будут равны нулю.
      </div>

      ${
        availableSourceLabels.length
          ? `
            <div class="dispatcher-source-picker">
              <label class="management-field">
                <span>Быстро добавить строку из последнего СК-11</span>
                <select id="dispatcherSourceSuggestion" class="dispatcher-select">
                  ${sourceOptions}
                </select>
              </label>
              <button id="dispatcherAddSourceButton" class="role-action" type="button">
                + Добавить
              </button>
            </div>
          `
          : ""
      }

      <label class="management-field dispatcher-source-editor-field">
        <span>Строки-источники · по одной на строку</span>
        <textarea
          id="dispatcherSourcesTextarea"
          rows="8"
          placeholder="Например:\nЮжный ВВР\nГПС Волосово"
        >${escapeHtml(sources.join("\n"))}</textarea>
      </label>

      <div class="dispatcher-source-defaults">
        <span>Настройка по умолчанию:</span>
        <strong>${escapeHtml(defaults.length ? defaults.join(" + ") : "нет источников")}</strong>
        <button id="dispatcherRestoreDefaultsButton" class="role-action" type="button">
          Подставить по умолчанию
        </button>
      </div>
    `
  });

  const addSourceButton =
    document.getElementById(
      "dispatcherAddSourceButton"
    );

  addSourceButton?.addEventListener(
    "click",
    () => {
      const select =
        document.getElementById(
          "dispatcherSourceSuggestion"
        );
      const textarea =
        document.getElementById(
          "dispatcherSourcesTextarea"
        );

      const value =
        String(select?.value || "")
          .trim();

      if (!value || !textarea) {
        return;
      }

      const current =
        String(textarea.value || "")
          .split("\n")
          .map(
            (item) =>
              item.trim()
          )
          .filter(Boolean);

      if (!current.includes(value)) {
        current.push(value);
      }

      textarea.value =
        current.join("\n");
      textarea.focus();
    }
  );

  const restoreButton =
    document.getElementById(
      "dispatcherRestoreDefaultsButton"
    );

  restoreButton?.addEventListener(
    "click",
    () => {
      const textarea =
        document.getElementById(
          "dispatcherSourcesTextarea"
        );

      if (textarea) {
        textarea.value =
          defaults.join("\n");
        textarea.focus();
      }
    }
  );
}

function bindDispatcherOutageRolePicker() {
  const groups = [
    ...managementBody.querySelectorAll(
      "[data-dispatcher-outage-division-group]"
    )
  ];

  const syncGroup = (group) => {
    const master = group.querySelector(
      'input[name="dispatcherOutageDivisionToggle"]'
    );
    const roles = [
      ...group.querySelectorAll(
        'input[name="dispatcherOutageRole"]'
      )
    ];
    const count = group.querySelector(
      "[data-dispatcher-outage-role-count]"
    );
    const checkedCount = roles.filter((input) => input.checked).length;

    if (master) {
      master.checked = roles.length > 0 && checkedCount === roles.length;
      master.indeterminate = checkedCount > 0 && checkedCount < roles.length;
      master.disabled = roles.length === 0;
    }

    group.classList.toggle("is-selected", checkedCount > 0);

    if (count) {
      count.textContent = `${checkedCount}/${roles.length}`;
    }
  };

  for (const group of groups) {
    const master = group.querySelector(
      'input[name="dispatcherOutageDivisionToggle"]'
    );
    const roles = [
      ...group.querySelectorAll(
        'input[name="dispatcherOutageRole"]'
      )
    ];

    master?.addEventListener("change", () => {
      for (const role of roles) {
        role.checked = master.checked;
      }
      syncGroup(group);
    });

    for (const role of roles) {
      role.addEventListener("change", () => syncGroup(group));
    }

    syncGroup(group);
  }
}

function openDispatcherOutageSourceEditor(
  unitId
) {
  const unit =
    dispatcherConfigCatalog.units.find(
      (item) => item.id === unitId
    );

  if (!unit) {
    return;
  }

  const selectedRolesByDivision =
    getDispatcherOutageSelectionMap(unit);

  const outageDivisions =
    Array.isArray(dispatcherConfigCatalog.outageDivisions)
      ? dispatcherConfigCatalog.outageDivisions
      : [];

  openManagementModal({
    eyebrow: "АКТИВНЫЕ ОТКЛЮЧЕНИЯ · ДИСПЕТЧЕР",
    title: `${dispatcherConfigGroupName(unit.groupId)} · ${unit.name}`,
    context: {
      type: "dispatcher-outage-source",
      unitId: unit.id
    },
    bodyHtml: `
      <div class="management-note">
        Выберите подразделения и конкретные роли внутри них, которые должны входить
        в этот РЭС / район. В сводку попадут только отмеченные роли. Одна настройка
        применяется одновременно к аварийному и плановому чату.
      </div>

      ${
        outageDivisions.length
          ? `
            <div class="dispatcher-outage-division-picker">
              ${outageDivisions.map((division) => {
                const divisionSources =
                  Array.isArray(division.sources)
                    ? division.sources
                        .map((source) => String(source || "").trim())
                        .filter(Boolean)
                    : [];
                const selectedRoles =
                  selectedRolesByDivision.get(String(division.id)) ||
                  new Set();
                const selectedCount = divisionSources.filter(
                  (source) => selectedRoles.has(source)
                ).length;

                return `
                  <article
                    class="dispatcher-outage-division-option ${selectedCount ? "is-selected" : ""}"
                    data-dispatcher-outage-division-group="${escapeHtml(division.id)}"
                  >
                    <div class="dispatcher-outage-division-option-head">
                      <label class="dispatcher-outage-division-master">
                        <input
                          type="checkbox"
                          name="dispatcherOutageDivisionToggle"
                          data-division-id="${escapeHtml(division.id)}"
                          ${divisionSources.length && selectedCount === divisionSources.length ? "checked" : ""}
                          ${divisionSources.length ? "" : "disabled"}
                        />
                        <span>
                          <strong>${escapeHtml(division.name)}</strong>
                          <small>
                            ${divisionSources.length
                              ? "Отметьте нужные роли или выберите подразделение целиком"
                              : "Роли/источники ещё не настроены"}
                          </small>
                        </span>
                      </label>
                      <span class="dispatcher-outage-role-count" data-dispatcher-outage-role-count>
                        ${selectedCount}/${divisionSources.length}
                      </span>
                    </div>

                    ${divisionSources.length
                      ? `
                        <div class="dispatcher-outage-role-picker">
                          ${divisionSources.map((source) => `
                            <label class="dispatcher-outage-role-option">
                              <input
                                type="checkbox"
                                name="dispatcherOutageRole"
                                data-division-id="${escapeHtml(division.id)}"
                                value="${escapeHtml(source)}"
                                ${selectedRoles.has(source) ? "checked" : ""}
                              />
                              <span>${escapeHtml(source)}</span>
                            </label>
                          `).join("")}
                        </div>
                      `
                      : ""}
                  </article>
                `;
              }).join("")}
            </div>
          `
          : `
            <div class="management-note is-warning">
              Сначала создайте хотя бы одно подразделение в блоке
              «Настройка подразделений активных отключений».
            </div>
          `
      }
    `
  });

  bindDispatcherOutageRolePicker();
}

function openManagementModal({
  eyebrow,
  title,
  bodyHtml,
  context,
  saveLabel = "Сохранить"
}) {
  managementEyebrow.textContent =
    eyebrow;

  managementTitle.textContent =
    title;

  managementBody.innerHTML =
    bodyHtml;

  managementContext =
    context;

  managementSaveButton
    .querySelector("span")
    .textContent =
      saveLabel;

  managementModal.classList.add(
    "is-open"
  );

  managementModal.setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeManagementEditor() {
  managementModal.classList.remove(
    "is-open"
  );

  managementModal.setAttribute(
    "aria-hidden",
    "true"
  );

  managementContext = null;
  managementBody.innerHTML = "";
  managementSaveButton
    .querySelector("span")
    .textContent =
      "Сохранить";
}

function panelCheckboxes(
  selectedPanelIds = []
) {
  const selected =
    new Set(
      selectedPanelIds
    );

  return `
    <div class="permission-grid">
      ${
        accessCatalog.panels
          .map(
            (panel) => `
              <label class="permission-option">
                <input
                  type="checkbox"
                  name="panelAccess"
                  value="${escapeHtml(
                    panel.id
                  )}"
                  ${
                    selected.has(
                      panel.id
                    )
                      ? "checked"
                      : ""
                  }
                />

                <span class="permission-copy">
                  <strong>
                    ${escapeHtml(
                      panel.name
                    )}
                  </strong>
                  <span>
                    ${escapeHtml(
                      panel.description ||
                      ""
                    )}
                  </span>
                </span>
              </label>
            `
          )
          .join("")
      }
    </div>
  `;
}

function renderDispatcherRoleScope(
  selectedDivisionId = "",
  allDivisions = false
) {
  const host =
    document.getElementById(
      "dispatcherRoleScopeWrap"
    );

  if (!host) {
    return;
  }

  const dispatcherEnabled =
    Boolean(
      managementBody.querySelector(
        'input[name="panelAccess"][value="dispatcher"]:checked'
      )
    );

  if (!dispatcherEnabled) {
    host.innerHTML = "";
    return;
  }

  const options =
    (accessCatalog.dispatcherDivisions || [])
      .map(
        (division) => `
          <option value="${escapeHtml(division.id)}" ${division.id === selectedDivisionId ? "selected" : ""}>
            ${escapeHtml(division.name)} — ${escapeHtml(division.description || "")}
          </option>
        `
      )
      .join("");

  host.innerHTML = `
    <div class="management-section-title">
      Подразделение диспетчерской роли
    </div>

    <label class="management-field">
      <span>Подразделение / филиал</span>
      <select id="dispatcherRoleDivisionSelect" class="dispatcher-select dispatcher-role-select">
        <option value="">Выберите подразделение</option>
        <option value="__all__" ${allDivisions ? "selected" : ""}>Все подразделения</option>
        ${options}
      </select>
    </label>

    <div class="management-note">
      Обычный контур жёстко ограничивает доступ на сервере. Например, роль
      «Диспетчер ВЭС» увидит только ВЭС и не сможет открыть ЮЭС, КС и другие
      подразделения даже прямым запросом к API. Опция «Все подразделения»
      подходит, например, для роли «Главный диспетчер».
    </div>
  `;
}

function bindDispatcherRoleScope(
  role
) {
  const checkboxes =
    managementBody.querySelectorAll(
      'input[name="panelAccess"]'
    );

  const refresh = () => {
    const currentValue =
      document.getElementById(
        "dispatcherRoleDivisionSelect"
      )?.value ||
      (
        role?.dispatcherAllDivisions
          ? "__all__"
          : role?.dispatcherDivisionId
      ) ||
      "";

    renderDispatcherRoleScope(
      currentValue === "__all__"
        ? ""
        : currentValue,
      currentValue === "__all__"
    );
  };

  checkboxes.forEach(
    (checkbox) => {
      checkbox.addEventListener(
        "change",
        refresh
      );
    }
  );

  refresh();
}

function roleColorEditorHtml(color) {
  const clean = normalizeRoleColor(color);
  return `
    <div class="role-color-editor">
      <div class="management-section-title">
        Цвет роли
      </div>
      <div class="role-color-control">
        <input
          id="roleColorPicker"
          class="role-color-picker"
          type="color"
          value="${clean}"
          aria-label="Выберите цвет роли"
        />
        <label class="management-field role-color-hex-field">
          <span>HEX</span>
          <input
            id="roleColorHexInput"
            maxlength="7"
            value="${clean}"
            placeholder="#39c6e6"
          />
        </label>
        <div id="roleColorPreview" class="role-color-preview" style="--role-preview: ${clean}; --role-preview-soft: ${roleColorRgba(clean, .12)}; --role-preview-line: ${roleColorRgba(clean, .38)}">
          <span></span>
          <strong>Предпросмотр роли</strong>
        </div>
      </div>
      <div class="role-color-presets">
        ${["#39c6e6", "#45d5a2", "#9f7bff", "#ffb84d", "#ff6b89", "#5b8cff", "#e879f9", "#94a3b8"].map((preset) => `
          <button type="button" class="role-color-preset" data-role-color-preset="${preset}" style="background:${preset}" title="${preset}"></button>
        `).join("")}
      </div>
    </div>
  `;
}

function bindRoleColorEditor() {
  const picker = document.getElementById("roleColorPicker");
  const hex = document.getElementById("roleColorHexInput");
  const preview = document.getElementById("roleColorPreview");

  if (!picker || !hex || !preview) return;

  const update = (value) => {
    const clean = normalizeRoleColor(value, picker.value || "#39c6e6");
    picker.value = clean;
    hex.value = clean;
    preview.style.setProperty("--role-preview", clean);
    preview.style.setProperty("--role-preview-soft", roleColorRgba(clean, .12));
    preview.style.setProperty("--role-preview-line", roleColorRgba(clean, .38));
  };

  picker.addEventListener("input", () => update(picker.value));
  hex.addEventListener("change", () => update(hex.value));
  hex.addEventListener("blur", () => update(hex.value));

  managementBody.querySelectorAll("[data-role-color-preset]").forEach((button) => {
    button.addEventListener("click", () => update(button.dataset.roleColorPreset));
  });
}

function getRoleColorEditorValue() {
  return normalizeRoleColor(
    document.getElementById("roleColorHexInput")?.value ||
    document.getElementById("roleColorPicker")?.value
  );
}

function openRoleColorEditor(roleId) {
  const role = roleById(roleId);
  if (!role) return;

  openManagementModal({
    eyebrow: "ЦВЕТ РОЛИ",
    title: role.name,
    saveLabel: "Сохранить цвет",
    context: {
      type: "role-color",
      roleId: role.id
    },
    bodyHtml: `
      <div class="management-note">
        Цвет используется в шапке Mini App и в интерфейсе управления ролями.
        Настройка применяется и к системным ролям, и к созданным вручную.
      </div>
      ${roleColorEditorHtml(role.color)}
    `
  });

  bindRoleColorEditor();
}

function openRoleEditor(
  roleId = null
) {
  const role =
    roleId
      ? roleById(roleId)
      : null;

  if (role?.builtin) {
    return;
  }

  openManagementModal({
    eyebrow:
      role
        ? "РЕДАКТИРОВАНИЕ РОЛИ"
        : "НОВАЯ РОЛЬ",
    title:
      role
        ? role.name
        : "Создать роль",
    context: {
      type: "role",
      roleId:
        role?.id || null
    },
    bodyHtml: `
      <label class="management-field">
        <span>Название роли</span>
        <input
          id="roleNameInput"
          maxlength="80"
          value="${escapeHtml(
            role?.name || ""
          )}"
          placeholder="Например: Старший диспетчер"
        />
      </label>

      <label class="management-field">
        <span>Описание</span>
        <textarea
          id="roleDescriptionInput"
          maxlength="300"
          placeholder="Кратко опишите назначение роли"
        >${escapeHtml(
          role?.description || ""
        )}</textarea>
      </label>

      ${roleColorEditorHtml(
        role?.color || "#39c6e6"
      )}

      <div class="management-section-title">
        Доступ к панелям
      </div>

      ${panelCheckboxes(
        role?.panelIds || []
      )}

      <div id="dispatcherRoleScopeWrap"></div>

      <div class="management-note">
        Список панелей формируется из единого реестра Mini App.
        Когда в будущем будет добавлена новая панель и зарегистрирована
        в системе, она автоматически появится здесь.
      </div>
    `
  });

  bindDispatcherRoleScope(
    role || null
  );
  bindRoleColorEditor();
}

function createUserRoleChoices() {
  const selected =
    new Set(["user"]);

  return accessCatalog.roles
    .map(
      (role) => {
        const panels =
          (role.panelIds || [])
            .map(panelNameById)
            .join(", ");

        return `
          <label class="role-choice">
            <input
              type="checkbox"
              name="newUserRole"
              value="${escapeHtml(role.id)}"
              ${selected.has(role.id) ? "checked" : ""}
            />

            <span class="role-choice-copy">
              <strong class="role-choice-title">
                <i class="role-choice-color" style="background:${normalizeRoleColor(role.color)}"></i>
                ${escapeHtml(role.name)}
                ${role.builtin ? " · системная" : ""}
              </strong>

              <span>
                ${escapeHtml(role.description || "Без описания")}
              </span>

              ${
                role.dispatcherAllDivisions
                  ? `
                    <span class="role-choice-panels">
                      Подразделения: Все
                    </span>
                  `
                  : role.dispatcherDivisionName
                    ? `
                      <span class="role-choice-panels">
                        Подразделение: ${escapeHtml(role.dispatcherDivisionName)}
                      </span>
                    `
                    : ""
              }

              <span class="role-choice-panels">
                Панели: ${escapeHtml(panels || "нет")}
              </span>
            </span>
          </label>
        `;
      }
    )
    .join("");
}

function openCreateUserEditor() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  openManagementModal({
    eyebrow:
      "НОВАЯ УЧЁТНАЯ ЗАПИСЬ",
    title:
      "Создать пользователя",
    saveLabel:
      "Создать пользователя",
    context: {
      type: "create-user"
    },
    bodyHtml: `
      <div class="user-create-grid">
        <label class="management-field">
          <span>Логин</span>
          <input
            id="newUserLoginInput"
            maxlength="64"
            autocomplete="off"
            placeholder="Например: Ivanov.II"
          />
        </label>

        <label class="management-field">
          <span>ФИО</span>
          <input
            id="newUserFullNameInput"
            maxlength="120"
            autocomplete="off"
            placeholder="Иванов Иван Иванович"
          />
        </label>
      </div>

      <label class="management-field">
        <span>Пароль</span>
        <input
          id="newUserPasswordInput"
          type="password"
          maxlength="200"
          autocomplete="new-password"
          placeholder="Минимум 8 символов"
        />
      </label>

      <div class="management-note">
        Пароль не сохраняется в открытом виде. На сервере хранится
        только PBKDF2-хэш и индивидуальная соль пользователя.
      </div>

      <div class="management-section-title">
        Роли пользователя
      </div>

      <div class="role-choice-grid">
        ${createUserRoleChoices()}
      </div>
    `
  });

  document.getElementById(
    "newUserLoginInput"
  )?.focus();
}

async function openUserRoleEditor(
  username,
  allowReload = true
) {
  if (!currentUser?.isDeveloper) {
    return;
  }

  let user =
    accessCatalog.users.find(
      (item) =>
        item.username ===
        username
    );

  if (
    !user &&
    allowReload
  ) {
    await loadAccessManagement();

    user =
      accessCatalog.users.find(
        (item) =>
          item.username ===
          username
      );
  }

  if (!user) {
    openModal({
      type: "denied",
      eyebrow:
        "УПРАВЛЕНИЕ ДОСТУПОМ",
      title:
        "Пользователь не найден",
      message:
        "Не удалось загрузить данные пользователя. Обновите центр управления и попробуйте ещё раз."
    });

    return;
  }

  const selected =
    new Set(
      user.roleIds || []
    );

  const choices =
    accessCatalog.roles
      .map(
        (role) => {
          const panels =
            (role.panelIds || [])
              .map(
                panelNameById
              )
              .join(", ");

          return `
            <label class="role-choice">
              <input
                type="checkbox"
                name="userRole"
                value="${escapeHtml(
                  role.id
                )}"
                ${
                  selected.has(
                    role.id
                  )
                    ? "checked"
                    : ""
                }
              />

              <span class="role-choice-copy">
                <strong class="role-choice-title">
                  <i class="role-choice-color" style="background:${normalizeRoleColor(role.color)}"></i>
                  ${escapeHtml(
                    role.name
                  )}
                  ${
                    role.builtin
                      ? " · системная"
                      : ""
                  }
                </strong>

                <span>
                  ${escapeHtml(
                    role.description ||
                    "Без описания"
                  )}
                </span>

                ${
                  role.dispatcherAllDivisions
                    ? `
                      <span class="role-choice-panels">
                        Подразделения: Все
                      </span>
                    `
                    : role.dispatcherDivisionName
                      ? `
                        <span class="role-choice-panels">
                          Подразделение: ${escapeHtml(
                            role.dispatcherDivisionName
                          )}
                        </span>
                      `
                      : ""
                }

                <span class="role-choice-panels">
                  Панели: ${
                    escapeHtml(
                      panels ||
                      "нет"
                    )
                  }
                </span>
              </span>
            </label>
          `;
        }
      )
      .join("");

  openManagementModal({
    eyebrow:
      "РОЛИ ПОЛЬЗОВАТЕЛЯ",
    title:
      user.fullName ||
      user.username,
    context: {
      type: "user",
      username:
        user.username
    },
    bodyHtml: `
      <div class="management-note">
        Логин: ${escapeHtml(
          user.username
        )}. Изменения вступают в силу сразу на сервере;
        повторный вход обычно не требуется.
        ${
          user.accountSource === "managed"
            ? "Учётная запись создана через Центр управления."
            : "Исходная учётная запись из APP_USERS_JSON; удаление отключит её через Redis/KV."
        }
      </div>

      <div class="management-section-title">
        Назначенные роли
      </div>

      <div class="role-choice-grid">
        ${choices}
      </div>

      ${
        user.username ===
          currentUser.username &&
        user.roleIds?.includes(
          "developer"
        )
          ? `
            <div class="management-note">
              Для защиты от случайной блокировки нельзя снять роль
              «Разработчик» у своей текущей учётной записи.
            </div>
          `
          : ""
      }

      ${
        user.username !==
          currentUser.username
          ? `
            <div class="user-danger-zone">
              <div>
                <strong>Удаление пользователя</strong>
                <span>Доступ будет отозван, роли и активная сессия очищены.</span>
              </div>
              <button
                id="deleteUserButton"
                class="danger-action"
                type="button"
              >
                Удалить
              </button>
            </div>
          `
          : ""
      }
    `
  });

  document.getElementById(
    "deleteUserButton"
  )?.addEventListener(
    "click",
    () =>
      deleteUserAccount(
        user.username,
        user.fullName ||
        user.username
      )
  );
}

async function saveManagementEditor() {
  if (!managementContext) {
    return;
  }

  managementSaveButton.disabled =
    true;

  managementSaveButton
    .querySelector("span")
    .textContent =
      "Сохранение…";

  try {
    if (
      managementContext.type === "executive-map-zone-edit"
    ) {
      await postDispatcherStructureAction({
        action: "update_executive_map_zone",
        zoneId: managementContext.zoneId || "",
        enabled: Boolean(document.getElementById("executiveMapZoneEnabled")?.checked),
        outageDivisionIds: selectedExecutiveEditorIds("executiveMapOutageDivision"),
        unitIds: selectedExecutiveEditorIds("executiveMapUnit")
      });
    }

    if (
      managementContext.type === "executive-table-row-create" ||
      managementContext.type === "executive-table-row-edit"
    ) {
      const name =
        document.getElementById("executiveRowNameInput")?.value.trim() || "";
      const description =
        document.getElementById("executiveRowDescriptionInput")?.value.trim() || "";

      await postDispatcherStructureAction({
        action:
          managementContext.type === "executive-table-row-create"
            ? "create_executive_row"
            : "update_executive_row",
        rowId: managementContext.rowId || "",
        name,
        description,
        outageDivisionIds: selectedExecutiveEditorIds("executiveOutageDivision"),
        requestGroupIds: selectedExecutiveEditorIds("executiveRequestGroup"),
        workorderGroupIds: selectedExecutiveEditorIds("executiveWorkorderGroup"),
        unitGroupIds: selectedExecutiveEditorIds("executiveUnitGroup")
      });
    }

    if (
      managementContext.type ===
      "create-user"
    ) {
      const username =
        document.getElementById(
          "newUserLoginInput"
        )?.value.trim() || "";

      const fullName =
        document.getElementById(
          "newUserFullNameInput"
        )?.value.trim() || "";

      const password =
        document.getElementById(
          "newUserPasswordInput"
        )?.value || "";

      const roleIds =
        [
          ...managementBody
            .querySelectorAll(
              'input[name="newUserRole"]:checked'
            )
        ].map(
          (input) =>
            input.value
        );

      const response =
        await fetch(
          API_ADMIN_USERS,
          {
            method: "POST",
            cache: "no-store",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              ...getSessionHeaders()
            },
            body: JSON.stringify({
              action: "create",
              username,
              fullName,
              password,
              roleIds
            })
          }
        );

      const payload =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Не удалось создать пользователя"
        );
      }
    }

    if (
      managementContext.type ===
      "role"
    ) {
      const name =
        document.getElementById(
          "roleNameInput"
        )?.value
          .trim();

      const description =
        document.getElementById(
          "roleDescriptionInput"
        )?.value
          .trim();

      const color =
        getRoleColorEditorValue();

      const panelIds =
        [
          ...managementBody
            .querySelectorAll(
              'input[name="panelAccess"]:checked'
            )
        ].map(
          (input) =>
            input.value
        );

      const dispatcherScopeValue =
        document.getElementById(
          "dispatcherRoleDivisionSelect"
        )?.value || "";

      const dispatcherAllDivisions =
        dispatcherScopeValue ===
        "__all__";

      const dispatcherDivisionId =
        dispatcherAllDivisions
          ? ""
          : dispatcherScopeValue;

      const response =
        await fetch(
          API_ADMIN_ROLES,
          {
            method: "POST",
            cache: "no-store",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              ...getSessionHeaders()
            },
            body: JSON.stringify({
              action:
                managementContext
                  .roleId
                  ? "update"
                  : "create",
              roleId:
                managementContext
                  .roleId,
              name,
              description,
              color,
              panelIds,
              dispatcherDivisionId,
              dispatcherAllDivisions
            })
          }
        );

      const payload =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Не удалось сохранить роль"
        );
      }
    }

    if (
      managementContext.type ===
      "role-color"
    ) {
      const response = await fetch(
        API_ADMIN_ROLES,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...getSessionHeaders()
          },
          body: JSON.stringify({
            action: "color",
            roleId: managementContext.roleId,
            color: getRoleColorEditorValue()
          })
        }
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось сохранить цвет роли");
      }
    }

    if (
      managementContext.type ===
      "outage-division-create" ||
      managementContext.type ===
      "outage-division-edit"
    ) {
      const name =
        document.getElementById(
          "outageDivisionNameInput"
        )?.value.trim() || "";

      const sources =
        String(
          document.getElementById(
            "outageSourcesTextarea"
          )?.value || ""
        )
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean);

      await postOutageConfigAction({
        action:
          managementContext.type ===
          "outage-division-create"
            ? "create"
            : "update",
        divisionId:
          managementContext.divisionId || "",
        name,
        sources
      });
    }

    if (
      managementContext.type ===
      "dispatcher-group-create"
    ) {
      const name =
        document.getElementById(
          "dispatcherNewGroupName"
        )?.value.trim() || "";

      const description =
        document.getElementById(
          "dispatcherNewGroupDescription"
        )?.value.trim() || "";

      await postDispatcherStructureAction({
        action: "create_group",
        name,
        description
      });
    }

    if (
      managementContext.type ===
      "dispatcher-group-edit"
    ) {
      const name =
        document.getElementById(
          "dispatcherEditGroupName"
        )?.value.trim() || "";

      const description =
        document.getElementById(
          "dispatcherEditGroupDescription"
        )?.value.trim() || "";

      await postDispatcherStructureAction({
        action: "update_group",
        groupId:
          managementContext.groupId,
        name,
        description
      });
    }

    if (
      managementContext.type ===
      "dispatcher-unit-create"
    ) {
      const groupId =
        document.getElementById(
          "dispatcherNewUnitGroup"
        )?.value || "";

      const name =
        document.getElementById(
          "dispatcherNewUnitName"
        )?.value.trim() || "";

      await postDispatcherStructureAction({
        action: "create_unit",
        groupId,
        name
      });
    }

    if (
      managementContext.type ===
      "user"
    ) {
      const roleIds =
        [
          ...managementBody
            .querySelectorAll(
              'input[name="userRole"]:checked'
            )
        ].map(
          (input) =>
            input.value
        );

      const response =
        await fetch(
          API_ADMIN_USER_ROLES,
          {
            method: "POST",
            cache: "no-store",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              ...getSessionHeaders()
            },
            body: JSON.stringify({
              username:
                managementContext
                  .username,
              roleIds
            })
          }
        );

      const payload =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Не удалось назначить роли"
        );
      }
    }

    if (
      managementContext.type ===
      "dispatcher-role-hierarchy"
    ) {
      const mainRole =
        document.getElementById(
          "dispatcherHierarchyMainRoleInput"
        )?.value.trim() || "";

      const subordinateRoles =
        String(
          document.getElementById(
            "dispatcherHierarchySubordinatesTextarea"
          )?.value || ""
        )
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean);

      await postDispatcherStructureAction({
        action: "save_role_hierarchy",
        unitId: managementContext.unitId,
        mainRole,
        subordinateRoles
      });
    }

    if (
      managementContext.type ===
      "dispatcher-workorders-source"
    ) {
      const textarea =
        document.getElementById(
          "dispatcherWorkordersSourcesTextarea"
        );

      const sources =
        String(
          textarea?.value || ""
        )
          .split("\n")
          .map(
            (value) =>
              value.trim()
          )
          .filter(Boolean);

      const response =
        await fetch(
          API_ADMIN_DISPATCHER_CONFIG,
          {
            method: "POST",
            cache: "no-store",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              ...getSessionHeaders()
            },
            body: JSON.stringify({
              action: "save_workorders",
              unitId:
                managementContext
                  .unitId,
              sources
            })
          }
        );

      const payload =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Не удалось сохранить источники НДР"
        );
      }
    }

    if (
      managementContext.type ===
      "dispatcher-outage-source"
    ) {
      const selectionMap = new Map();
      const selectedRoleInputs = [
        ...managementBody.querySelectorAll(
          'input[name="dispatcherOutageRole"]:checked'
        )
      ];

      for (const input of selectedRoleInputs) {
        const divisionId = String(input.dataset.divisionId || "").trim();
        const source = String(input.value || "").trim();
        if (!divisionId || !source) continue;

        if (!selectionMap.has(divisionId)) {
          selectionMap.set(divisionId, []);
        }
        selectionMap.get(divisionId).push(source);
      }

      const selections = [...selectionMap.entries()]
        .map(([divisionId, sources]) => ({
          divisionId,
          sources: [...new Set(sources)]
        }));
      const divisionIds = selections.map(
        (selection) => selection.divisionId
      );

      const response = await fetch(
        API_ADMIN_DISPATCHER_CONFIG,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...getSessionHeaders()
          },
          body: JSON.stringify({
            action: "save_outages",
            unitId: managementContext.unitId,
            divisionIds,
            selections
          })
        }
      );

      const payload = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Не удалось сохранить источники активных отключений"
        );
      }
    }

    if (
      managementContext.type ===
      "dispatcher-source"
    ) {
      const textarea =
        document.getElementById(
          "dispatcherSourcesTextarea"
        );

      const sources =
        String(
          textarea?.value || ""
        )
          .split("\n")
          .map(
            (value) =>
              value.trim()
          )
          .filter(Boolean);

      const response =
        await fetch(
          API_ADMIN_DISPATCHER_CONFIG,
          {
            method: "POST",
            cache: "no-store",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              ...getSessionHeaders()
            },
            body: JSON.stringify({
              action: "save",
              unitId:
                managementContext
                  .unitId,
              sources
            })
          }
        );

      const payload =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Не удалось сохранить источники СК-11"
        );
      }
    }

    closeManagementEditor();

    await Promise.all([
      loadAccessManagement(),
      loadAdminDashboard(),
      loadOutageConfigManagement(),
      loadDispatcherConfigManagement()
    ]);

    /*
      Если разработчик изменил кому-то роли, backend уже применяет
      их сразу. Для текущего пользователя обновляем /api/me тоже.
    */
    const meResponse =
      await fetch(
        API_ME,
        {
          method: "GET",
          cache: "no-store",
          credentials:
            "include",
          headers:
            getSessionHeaders()
        }
      );

    if (meResponse.ok) {
      const mePayload =
        await meResponse.json();

      if (
        mePayload?.user
      ) {
        setUserUi(
          mePayload.user
        );
      }
    }
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow:
        "УПРАВЛЕНИЕ ДОСТУПОМ",
      title:
        "Не удалось сохранить",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  } finally {
    managementSaveButton.disabled =
      false;

    managementSaveButton
      .querySelector("span")
      .textContent =
        managementContext?.type ===
          "create-user"
          ? "Создать пользователя"
          : managementContext?.type === "role-color"
            ? "Сохранить цвет"
            : "Сохранить";
  }
}

async function deleteUserAccount(
  username,
  fullName
) {
  const confirmed =
    window.confirm(
      `Удалить пользователя «${fullName}» (${username})? Доступ к Mini App будет отозван.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await fetch(
        API_ADMIN_USERS,
        {
          method: "POST",
          cache: "no-store",
          credentials:
            "include",
          headers: {
            "Content-Type":
              "application/json",
            ...getSessionHeaders()
          },
          body: JSON.stringify({
            action: "delete",
            username
          })
        }
      );

    const payload =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось удалить пользователя"
      );
    }

    closeManagementEditor();

    await Promise.all([
      loadAccessManagement(),
      loadAdminDashboard()
    ]);
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow:
        "УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ",
      title:
        "Не удалось удалить пользователя",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  }
}

async function deleteCustomRole(
  roleId
) {
  const role =
    roleById(roleId);

  if (!role || role.builtin) {
    return;
  }

  const confirmed =
    window.confirm(
      `Удалить роль «${role.name}»? Пользователи с этой ролью вернутся к оставшимся ролям или к значениям из APP_USERS_JSON.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await fetch(
        API_ADMIN_ROLES,
        {
          method: "POST",
          cache: "no-store",
          credentials:
            "include",
          headers: {
            "Content-Type":
              "application/json",
            ...getSessionHeaders()
          },
          body: JSON.stringify({
            action: "delete",
            roleId
          })
        }
      );

    const payload =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось удалить роль"
      );
    }

    await Promise.all([
      loadAccessManagement(),
      loadAdminDashboard()
    ]);
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow:
        "УПРАВЛЕНИЕ ДОСТУПОМ",
      title:
        "Не удалось удалить роль",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  }
}

createUserButton.addEventListener(
  "click",
  openCreateUserEditor
);

createRoleButton.addEventListener(
  "click",
  () =>
    openRoleEditor()
);

outageCreateDivisionButton.addEventListener(
  "click",
  openCreateOutageDivisionEditor
);

executiveTableCreateButton?.addEventListener(
  "click",
  () => openExecutiveTableRowEditor()
);

dispatcherConfigGroupSelect.addEventListener(
  "change",
  renderDispatcherConfigList
);

dispatcherWorkordersConfigGroupSelect.addEventListener(
  "change",
  renderDispatcherWorkordersConfigList
);

dispatcherPersonnelChatSaveButton?.addEventListener("click", async () => {
  const chatId = String(dispatcherPersonnelChatIdInput?.value || "").trim();
  dispatcherPersonnelChatSaveButton.disabled = true;
  if (dispatcherPersonnelSourceStatus) {
    dispatcherPersonnelSourceStatus.textContent = "Сохраняю ID чата и проверяю последнюю полную волну…";
    dispatcherPersonnelSourceStatus.classList.remove("is-warning");
  }
  try {
    await postDispatcherStructureAction({
      action: "save_duty_personnel_config",
      chatId
    });
    await loadDispatcherConfigManagement();
  } catch (error) {
    if (dispatcherPersonnelSourceStatus) {
      dispatcherPersonnelSourceStatus.textContent =
        error instanceof Error ? error.message : "Не удалось сохранить источник ФИО";
      dispatcherPersonnelSourceStatus.classList.add("is-warning");
    }
  } finally {
    dispatcherPersonnelChatSaveButton.disabled = false;
  }
});

dispatcherHierarchyConfigGroupSelect?.addEventListener(
  "change",
  renderDispatcherHierarchyConfigList
);

dispatcherCreateGroupButton.addEventListener(
  "click",
  openCreateDispatcherGroupEditor
);

dispatcherCreateUnitButton.addEventListener(
  "click",
  openCreateDispatcherUnitEditor
);

dispatcherEditGroupButton.addEventListener(
  "click",
  openEditDispatcherGroupEditor
);

dispatcherDeleteGroupButton.addEventListener(
  "click",
  deleteSelectedDispatcherGroup
);

closeManagementModal.addEventListener(
  "click",
  closeManagementEditor
);

managementCancelButton.addEventListener(
  "click",
  closeManagementEditor
);

managementSaveButton.addEventListener(
  "click",
  saveManagementEditor
);

managementModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      managementModal
    ) {
      closeManagementEditor();
    }
  }
);

function startAdminRefresh() {
  stopAdminRefresh();

  adminRefreshTimer =
    setInterval(
      () => {
        if (
          currentView === "admin" &&
          isAppVisible()
        ) {
          loadAdminDashboard();
        }
      },
      ADMIN_REFRESH_INTERVAL_MS
    );
}

function stopAdminRefresh() {
  if (adminRefreshTimer) {
    clearInterval(
      adminRefreshTimer
    );

    adminRefreshTimer = null;
  }
}

modeSelector.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(
        ".mode-option"
      );

    if (!button) {
      return;
    }

    selectMode(
      button.dataset.mode
    );
  }
);

saveSystemStateButton.addEventListener(
  "click",
  saveSystemState
);

refreshAdminButton.addEventListener(
  "click",
  loadAdminDashboard
);

/* =========================================================
   АВАРИЙНЫЙ МОНИТОРИНГ
   ========================================================= */

function renderOutageObjects(objects = []) {
  const items = Array.isArray(objects)
    ? objects.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (!items.length) return "";

  const PREVIEW_LIMIT = 6;
  const preview = items.slice(0, PREVIEW_LIMIT);
  const hidden = items.slice(PREVIEW_LIMIT);

  const chips = (values) => values
    .map((item) => `<span class="outage-object-chip">${escapeHtml(item)}</span>`)
    .join("");

  if (!hidden.length) {
    return `
      <div class="outage-detail-field outage-objects-field">
        <span>Обесточенные объекты</span>
        <div class="outage-object-chips">${chips(preview)}</div>
      </div>
    `;
  }

  return `
    <div class="outage-detail-field outage-objects-field">
      <span>Обесточенные объекты</span>
      <div class="outage-object-chips">${chips(preview)}</div>
      <details class="outage-objects-more">
        <summary>Показать ещё ${hidden.length} ${pluralizeRu(hidden.length, "объект", "объекта", "объектов")}</summary>
        <div class="outage-object-chips outage-object-chips-more">${chips(hidden)}</div>
      </details>
    </div>
  `;
}

function renderOutageEvent(event = {}) {
  const appeals = Number(event?.appeals || 0);
  const equipment = String(event?.equipment || "").trim();
  const energyObject = String(event?.energyObject || "").trim();
  const createdAt = String(event?.createdAt || "").trim();
  const createdBy = String(event?.createdBy || "").trim();

  return `
    <article class="outage-event-card">
      <div class="outage-event-head">
        <div>
          <span class="outage-event-kicker">ОТКЛЮЧЕНИЕ</span>
          <strong>#${escapeHtml(event?.id || "—")}</strong>
        </div>
        <div class="outage-event-appeals ${appeals > 0 ? "has-appeals" : ""}">
          <span>Обращений</span>
          <strong>${appeals}</strong>
        </div>
      </div>

      <div class="outage-event-grid">
        ${createdAt ? `
          <div class="outage-detail-field">
            <span>Создано</span>
            <strong>${escapeHtml(createdAt)}</strong>
          </div>
        ` : ""}
        ${createdBy ? `
          <div class="outage-detail-field outage-created-by-field">
            <span>Создал</span>
            <strong>${escapeHtml(createdBy)}</strong>
          </div>
        ` : ""}
        ${equipment ? `
          <div class="outage-detail-field">
            <span>Оборудование</span>
            <strong>${escapeHtml(equipment)}</strong>
          </div>
        ` : ""}
        ${energyObject ? `
          <div class="outage-detail-field">
            <span>Энергообъект</span>
            <strong>${escapeHtml(energyObject)}</strong>
          </div>
        ` : ""}
      </div>

      ${renderOutageObjects(event?.disconnectedObjects)}
    </article>
  `;
}

function renderOutageSource(source = {}) {
  const outages = Array.isArray(source?.outages) ? source.outages : [];
  const count = Number(source?.count || 0);
  const appeals = Number(source?.appeals || 0);
  const canOpen = Boolean(source?.matched) && outages.length > 0;

  return `
    <details class="outage-source-details ${source?.matched ? "" : "is-missing"}">
      <summary ${canOpen ? "" : "data-no-toggle=\"true\""}>
        <div class="outage-source-summary-main">
          <span>${escapeHtml(source?.label || source?.source || "Источник")}</span>
          ${source?.matched ? "" : "<small>Строка не найдена в последней сводке</small>"}
        </div>
        <div class="outage-source-summary-metrics">
          <span><b>${count}</b> откл.</span>
          <span class="${appeals > 0 ? "has-appeals" : ""}"><b>${appeals}</b> обращ.</span>
          ${canOpen ? `
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>
          ` : ""}
        </div>
      </summary>
      ${canOpen ? `
        <div class="outage-events-list">
          ${outages.map((event) => renderOutageEvent(event)).join("")}
        </div>
      ` : ""}
    </details>
  `;
}

function renderDivisionCards(divisions = []) {
  const items = Array.isArray(divisions) ? divisions : [];

  divisionCountCaption.textContent =
    `${items.length} ${pluralizeRu(
      items.length,
      "подразделение",
      "подразделения",
      "подразделений"
    )}`;

  if (!items.length) {
    divisionGrid.innerHTML = `
      <div class="monitoring-loading-card">
        Подразделения активных отключений пока не настроены.
      </div>
    `;
    return;
  }

  divisionGrid.innerHTML = items.map((division) => {
    const breakdown = Array.isArray(division?.sourceBreakdown)
      ? division.sourceBreakdown
      : [];
    const canExpand = breakdown.length > 0;
    const isExpanded = canExpand && expandedOutageDivisionIds.has(String(division.id));
    const appeals = Number(division?.appeals || 0);
    const divisionName = String(division?.name || "").trim();
    const normalizedDivisionName = divisionName.toLowerCase();
    const isShiftUnassigned = normalizedDivisionName.includes("не приняв");
    const hasLongTitle = divisionName.length >= 16 || /\s/.test(divisionName);

    return `
      <article
        class="division-card outage-counter-card ${isExpanded ? "is-expanded" : ""} ${hasLongTitle ? "has-long-title" : ""} ${isShiftUnassigned ? "outage-card-shift-unassigned" : ""}"
        id="card-${escapeHtml(division.id)}"
      >
        <div class="division-header outage-counter-header">
          <div class="division-main">
            <div class="division-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 2 4 14h7l-1 8 10-13h-7z"></path>
              </svg>
            </div>

            <div>
              <div class="division-kicker">ПОДРАЗДЕЛЕНИЕ</div>
              <h2>${escapeHtml(division.name)}</h2>
              <p>${escapeHtml(outageKindMeta().activeLabel)}</p>
            </div>
          </div>

          <div class="division-actions outage-counter-actions">
            <div class="outage-counter-metrics">
              <div class="counter outage-counter-value">
                <span>Отключений</span>
                <strong class="division-count">${Number(division.count || 0)}</strong>
              </div>
              <div class="counter outage-counter-value outage-appeals-value ${appeals > 0 ? "has-appeals" : ""}">
                <span>Обращений</span>
                <strong>${appeals}</strong>
              </div>
            </div>

            ${canExpand ? `
              <button
                class="outage-sources-toggle"
                type="button"
                data-outage-sources-toggle="${escapeHtml(division.id)}"
                aria-expanded="${isExpanded ? "true" : "false"}"
                aria-controls="outage-sources-${escapeHtml(division.id)}"
                title="Показать РЭС и отключения"
              >
                <span>${isExpanded ? "Скрыть детали" : `Подробнее · ${breakdown.length} ${pluralizeRu(breakdown.length, "РЭС", "РЭС", "РЭС")}`}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" class="${isExpanded ? "is-open" : ""}">
                  <path d="m7 10 5 5 5-5"></path>
                </svg>
              </button>
            ` : ""}
          </div>
        </div>

        ${canExpand ? `
          <div
            id="outage-sources-${escapeHtml(division.id)}"
            class="outage-sources-breakdown outage-sources-detailed"
            ${isExpanded ? "" : "hidden"}
          >
            <div class="outage-breakdown-head">
              <div>
                <span>ДЕТАЛИЗАЦИЯ</span>
                <strong>РЭС / районы и активные отключения</strong>
              </div>
              <div>
                <span>${Number(division.count || 0)} отключений</span>
                <span>${appeals} обращений</span>
              </div>
            </div>
            ${division?.detailsLoaded
              ? breakdown.map((source) => renderOutageSource(source)).join("")
              : `
                <div class="outage-detail-lazy-state ${division?.detailError ? "is-error" : ""}">
                  ${division?.detailError ? "" : '<span class="system-pulse"></span>'}
                  <span>${division?.detailError
                    ? `Не удалось загрузить детали: ${escapeHtml(division.detailError)}. Сверните и откройте снова.`
                    : "Загрузка деталей только для этого подразделения…"}</span>
                </div>
              `}
          </div>
        ` : ""}
      </article>
    `;
  }).join("");

  divisionGrid
    .querySelectorAll("[data-outage-sources-toggle]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const divisionId = String(button.dataset.outageSourcesToggle || "");
        if (!divisionId) return;

        if (expandedOutageDivisionIds.has(divisionId)) {
          expandedOutageDivisionIds.delete(divisionId);
          renderDivisionCards(outageDivisionsState.length ? outageDivisionsState : items);
          return;
        }

        expandedOutageDivisionIds.add(divisionId);
        renderDivisionCards(outageDivisionsState.length ? outageDivisionsState : items);

        const division = (outageDivisionsState.length ? outageDivisionsState : items)
          .find((item) => String(item?.id || "") === divisionId);

        if (!division?.detailsLoaded) {
          loadOutageDivisionDetails(divisionId);
        }
      });
    });

  divisionGrid
    .querySelectorAll('.outage-source-details > summary[data-no-toggle="true"]')
    .forEach((summary) => {
      summary.addEventListener("click", (event) => event.preventDefault());
    });
}

function pluralizeRu(
  value,
  one,
  few,
  many
) {
  const number = Math.abs(Number(value || 0));
  const lastTwo = number % 100;
  const last = number % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return many;
  }

  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

async function fetchOutageTypeOverview(kind) {
  const initData = getMaxInitData();
  if (!initData) {
    throw new Error("Откройте мини-приложение внутри MAX.");
  }

  const sessionToken = getAppSessionToken();
  const params = new URLSearchParams({
    kind,
    overview: "1"
  });

  const { response, payload, notModified } = await fetchJsonWithEtag(
    `${API_OUTAGES}?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "X-Max-Init-Data": initData,
        ...(sessionToken ? { "X-App-Session": sessionToken } : {})
      }
    },
    `outages:overview:${kind}`
  );

  if (response.status === 401) {
    setAppSessionToken("");
    stopAutoRefresh();
    showLoginScreen();
    throw new Error("Сессия завершена. Авторизуйтесь снова.");
  }

  if (!response.ok && !notModified) {
    throw new Error(payload?.error || `Сервер вернул ошибку ${response.status}`);
  }

  return payload || {};
}

function renderOutageTypeOverviewCard(kind, payload) {
  const planned = kind === "planned";
  const countEl = planned ? plannedOutagesChoiceCount : emergencyOutagesChoiceCount;
  const statusEl = planned ? plannedOutagesChoiceStatus : emergencyOutagesChoiceStatus;
  const cardEl = planned ? plannedOutagesChoice : emergencyOutagesChoice;

  if (!countEl || !statusEl || !cardEl) return;

  const configured = Boolean(payload?.configured);
  const total = payload?.total;

  countEl.textContent = total === null || total === undefined
    ? "—"
    : String(Number(total || 0));

  cardEl.classList.toggle("is-not-configured", !configured);

  if (!configured) {
    statusEl.textContent = planned
      ? "Нужно указать PLANNED_OUTAGES_CHAT_ID"
      : "Чат аварийных отключений не настроен";
    return;
  }

  if (payload?.status === "ok") {
    statusEl.textContent = payload?.sourceUpdatedAt
      ? `Обновлено: ${payload.sourceUpdatedAt}`
      : "Сводка получена";
  } else if (payload?.stale) {
    statusEl.textContent = "Показаны последние сохранённые данные";
  } else {
    statusEl.textContent = payload?.message || "Сводка пока недоступна";
  }
}

async function loadOutageTypeOverview() {
  if (currentView !== "monitoring" || selectedOutageKind) return;

  dashboardStatus.textContent = "Обновление сводок отключений";
  emergencyOutagesChoiceStatus.textContent = "Получение сводки…";
  plannedOutagesChoiceStatus.textContent = "Получение сводки…";

  const results = await Promise.allSettled([
    fetchOutageTypeOverview("emergency"),
    fetchOutageTypeOverview("planned")
  ]);

  if (currentView !== "monitoring" || selectedOutageKind) return;

  const [emergencyResult, plannedResult] = results;

  if (emergencyResult.status === "fulfilled") {
    renderOutageTypeOverviewCard("emergency", emergencyResult.value);
  } else {
    emergencyOutagesChoiceCount.textContent = "—";
    emergencyOutagesChoiceStatus.textContent = emergencyResult.reason instanceof Error
      ? emergencyResult.reason.message
      : "Не удалось получить сводку";
  }

  if (plannedResult.status === "fulfilled") {
    renderOutageTypeOverviewCard("planned", plannedResult.value);
  } else {
    plannedOutagesChoiceCount.textContent = "—";
    plannedOutagesChoiceStatus.textContent = plannedResult.reason instanceof Error
      ? plannedResult.reason.message
      : "Не удалось получить сводку";
  }

  dashboardStatus.textContent = "Аварийные и плановые отключения";
}

function renderOutageLoadError(message) {
  dashboardStatus.textContent =
    message || "Данные недоступны";

  totalOutages.textContent = "—";

  if (!divisionGrid.children.length) {
    divisionGrid.innerHTML = `
      <div class="monitoring-loading-card is-error">
        ${escapeHtml(message || outageKindMeta().error)}
      </div>
    `;
  }
}

async function loadOutageDivisionDetails(divisionId) {
  const id = String(divisionId || "").trim();

  if (!id || outageDetailLoadingIds.has(id)) {
    return;
  }

  const initData = getMaxInitData();
  if (!initData) return;

  const sessionToken = getAppSessionToken();
  const requestKind = selectedOutageKind || "emergency";
  const params = new URLSearchParams({
    kind: requestKind,
    division: id,
    details: "1"
  });
  const url = `${API_OUTAGES}?${params.toString()}`;

  outageDetailLoadingIds.add(id);

  try {
    const {
      response,
      payload,
      notModified
    } = await fetchJsonWithEtag(
      url,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "X-Max-Init-Data": initData,
          ...(sessionToken ? { "X-App-Session": sessionToken } : {})
        }
      },
      `outages:${requestKind}:detail:${id}`
    );

    if (response.status === 401) {
      setAppSessionToken("");
      stopAutoRefresh();
      showLoginScreen();
      return;
    }

    if (!response.ok && !notModified) {
      throw new Error(
        payload?.error ||
        `Сервер вернул ошибку ${response.status}`
      );
    }

    const detail = Array.isArray(payload?.divisions)
      ? payload.divisions[0]
      : null;

    if (!detail) {
      throw new Error("Детализация подразделения не получена");
    }

    if (selectedOutageKind !== requestKind) {
      return;
    }

    outageDivisionsState = outageDivisionsState.map((division) =>
      String(division?.id || "") === id
        ? {
            ...division,
            ...detail,
            detailsLoaded: true,
            detailError: ""
          }
        : division
    );

    if (currentView === "monitoring") {
      renderDivisionCards(outageDivisionsState);
    }
  } catch (error) {
    console.error("Outage detail load failed:", error);

    if (selectedOutageKind !== requestKind) {
      return;
    }

    outageDivisionsState = outageDivisionsState.map((division) =>
      String(division?.id || "") === id
        ? {
            ...division,
            detailsLoaded: false,
            detailError:
              error instanceof Error
                ? error.message
                : "Не удалось загрузить детализацию"
          }
        : division
    );

    if (currentView === "monitoring") {
      renderDivisionCards(outageDivisionsState);
    }
  } finally {
    outageDetailLoadingIds.delete(id);
  }
}

async function loadAllDivisions() {
  if (!selectedOutageKind) {
    return loadOutageTypeOverview();
  }

  const version = ++loadVersion;
  const meta = outageKindMeta();

  dashboardStatus.textContent =
    `Обновление: ${meta.label}`;

  const initData = getMaxInitData();

  if (!initData) {
    renderOutageLoadError(
      "Откройте мини-приложение внутри MAX."
    );
    return;
  }

  const sessionToken = getAppSessionToken();

  try {
    const {
      response,
      payload,
      notModified
    } = await fetchJsonWithEtag(
      `${API_OUTAGES}?${new URLSearchParams({ kind: selectedOutageKind }).toString()}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "X-Max-Init-Data": initData,
          ...(sessionToken ? { "X-App-Session": sessionToken } : {})
        }
      },
      `outages:${selectedOutageKind}:summary`
    );

    if (response.status === 401) {
      setAppSessionToken("");
      stopAutoRefresh();
      showLoginScreen();

      throw new Error(
        "Сессия завершена. Авторизуйтесь снова."
      );
    }

    if (!response.ok && !notModified) {
      throw new Error(
        payload?.error ||
        `Сервер вернул ошибку ${response.status}`
      );
    }

    if (version !== loadVersion) return;

    if (notModified && outageDivisionsState.length) {
      dashboardStatus.textContent = "Изменений в сводке нет";
      return;
    }

    const divisions =
      Array.isArray(payload?.divisions)
        ? payload.divisions
        : [];

    outageSourceUpdatedAt = String(
      payload?.sourceUpdatedAt ||
      payload?.messageTimestamp ||
      ""
    );

    outageDivisionsState = divisions.map((division) => ({
      ...division,
      detailsLoaded: Boolean(division?.detailsLoaded),
      detailError: ""
    }));

    renderDivisionCards(outageDivisionsState);

    totalOutages.textContent =
      payload?.total === null ||
      payload?.total === undefined
        ? "—"
        : Number(payload.total || 0);

    if (payload?.status === "ok") {
      dashboardStatus.textContent =
        "Все подразделения обновлены";
    } else if (payload?.stale) {
      dashboardStatus.textContent =
        "Показаны последние сохранённые данные";
    } else {
      dashboardStatus.textContent =
        payload?.message ||
        "Сводка пока недоступна";
    }

    updatedAt.textContent = formatSourceUpdate(
      payload?.sourceUpdatedAt || formatDateTime(new Date().toISOString())
    );

    const expandedToRefresh = outageDivisionsState
      .filter((division) =>
        expandedOutageDivisionIds.has(String(division?.id || "")) &&
        !division?.detailsLoaded
      )
      .map((division) => String(division.id));

    for (const divisionId of expandedToRefresh) {
      loadOutageDivisionDetails(divisionId);
    }
  } catch (error) {
    if (version !== loadVersion) return;

    renderOutageLoadError(
      error instanceof Error
        ? error.message
        : `Ошибка загрузки: ${meta.label.toLowerCase()}`
    );
  }
}

function startAutoRefresh() {
  stopAutoRefresh();

  refreshTimer = setInterval(
    () => {
      if (currentView === "monitoring" && isAppVisible()) {
        if (selectedOutageKind) {
          loadAllDivisions();
        } else {
          loadOutageTypeOverview();
        }
      }
    },
    REFRESH_INTERVAL_MS
  );
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (!isAppVisible()) {
    return;
  }

  sendHeartbeat();

  if (currentView === "monitoring") {
    if (selectedOutageKind) {
      loadAllDivisions();
    } else {
      loadOutageTypeOverview();
    }
  } else if (currentView === "dispatcher") {
    loadDispatcherDashboard({ quiet: true });
  } else if (currentView === "executive") {
    loadExecutiveDashboard({ quiet: true });
  } else if (currentView === "admin") {
    loadAdminDashboard();
  }
});

/*
  Подтверждение выхода из мини-приложения.
  - Кнопка «Назад» MAX и системный «назад» (Android/жест): в разделе —
    возврат на главный экран, на главном экране — окно «Вы точно хотите
    выйти из приложения?». Выход только по кнопке «Да»; крестик или клик
    мимо окна просто закрывают его.
  - Крестик/свайп закрытия самой шапки MAX обрабатывает клиент MAX:
    страница не может показать там своё окно, поэтому для этого случая
    включается штатное подтверждение закрытия MAX (enableClosingConfirmation).
*/
let appExitConfirmed = false;
let maxExitHandlersAttached = false;

function isExitConfirmOpen() {
  return Boolean(exitConfirmModal?.classList.contains("is-open"));
}

function openExitConfirm() {
  if (!exitConfirmModal) return;
  exitConfirmModal.classList.add("is-open");
  exitConfirmModal.setAttribute("aria-hidden", "false");
}

function closeExitConfirm() {
  if (!exitConfirmModal) return;
  exitConfirmModal.classList.remove("is-open");
  exitConfirmModal.setAttribute("aria-hidden", "true");
}

function confirmAppExit() {
  appExitConfirmed = true;
  closeExitConfirm();

  const webApp = window.WebApp;

  try {
    webApp?.disableClosingConfirmation?.();
  } catch {
    // Метод может отсутствовать в старых версиях MAX Bridge.
  }

  try {
    if (typeof webApp?.close === "function") {
      webApp.close();
      return;
    }
  } catch {
    // Переходим к запасному варианту ниже.
  }

  // Вне MAX (обычный браузер): закрываем вкладку или уходим со страницы
  // назад по истории (2 шага: исходная запись + запись-«ловушка»).
  window.close();
  setTimeout(() => history.go(-2), 150);
}

function handleAppBackAction() {
  if (isExitConfirmOpen()) {
    closeExitConfirm();
    return;
  }

  if (managementModal?.classList.contains("is-open")) {
    closeManagementEditor();
    return;
  }

  if (accessModal?.classList.contains("is-open")) {
    closeModal();
    return;
  }

  if (currentView === "requests") {
    closeRequestsView();
    return;
  }

  if (document.getElementById("woHistoryModal")?.classList.contains("is-open")) {
    closeWoHistoryModal();
    return;
  }

  if (currentView === "workorders") {
    closeWorkordersView();
    return;
  }

  if (currentView !== "home" && document.body.classList.contains("authenticated")) {
    navigateHome();
    return;
  }

  openExitConfirm();
}

function armHistoryExitGuard() {
  try {
    history.pushState({ appExitGuard: true }, "");
  } catch {
    // История может быть недоступна во встроенном WebView.
  }
}

function attachMaxExitHandlers(webApp = window.WebApp) {
  if (!webApp || maxExitHandlersAttached) return;
  maxExitHandlersAttached = true;

  try {
    webApp.enableClosingConfirmation?.();
  } catch {
    // Штатное подтверждение закрытия поддерживается не во всех версиях.
  }

  try {
    webApp.BackButton?.onClick?.(handleAppBackAction);
    webApp.BackButton?.show?.();
  } catch {
    // Без кнопки «Назад» остаётся системный «назад» через историю.
  }
}

window.addEventListener("popstate", () => {
  if (appExitConfirmed) return;
  armHistoryExitGuard();
  handleAppBackAction();
});

exitConfirmCloseButton?.addEventListener("click", closeExitConfirm);
exitConfirmYesButton?.addEventListener("click", confirmAppExit);

exitConfirmModal?.addEventListener("click", (event) => {
  if (event.target === exitConfirmModal) {
    closeExitConfirm();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isExitConfirmOpen()) {
    closeExitConfirm();
  }
});

armHistoryExitGuard();

loadMaxBridge()
  .then((webApp) => attachMaxExitHandlers(webApp))
  .catch(() => {
    // Повторим при успешном входе.
  });

checkSession();


document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      managementModal.classList.contains(
        "is-open"
      )
    ) {
      closeManagementEditor();
    }
  }
);


/*
  Энергетические анимации: токовое кольцо вокруг круговых диаграмм.
  Элемент декоративный (aria-hidden), движение — в CSS и выключается
  при prefers-reduced-motion и в экономном режиме (low-bandwidth).
*/
(function setupEnergyAnimations() {
  const addOrbit = (donut) => {
    if (!donut || donut.querySelector(":scope > .donut-orbit")) return;
    const orbit = document.createElement("span");
    orbit.className = "donut-orbit";
    orbit.setAttribute("aria-hidden", "true");
    donut.appendChild(orbit);
  };

  document.querySelectorAll(".dispatcher-workorders-donut").forEach(addOrbit);
})();


/* Лента телеметрии: часы (МСК) */
(function(){
  const c=document.getElementById("ribbonClock"),d=document.getElementById("ribbonDate");
  if(!c)return;
  const tick=()=>{const n=new Date();
    c.textContent=n.toLocaleTimeString("ru-RU",{timeZone:"Europe/Moscow",hour12:false});
    d.textContent=n.toLocaleDateString("ru-RU",{timeZone:"Europe/Moscow",day:"2-digit",month:"short"}).toUpperCase()+" · МСК";};
  tick();setInterval(tick,1000);
})();

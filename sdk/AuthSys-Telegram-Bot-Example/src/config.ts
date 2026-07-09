export default {
  loading: {
    buttons: true,
    commands: true,
    setCommands: true,
  },
  paths: {
    buttons: "buttons",
    commands: "commands",
  },
  logging: {
    buttonLoad: true,
    commandLoad: true,
    buttonUse: true,
    commandUse: true,
  },
  api: {
    baseUrl: (process.env.API_URL || "https://authsys-main-production.up.railway.app/api/v1/developer/sellers"),
    timeout: 5000,
  }
}
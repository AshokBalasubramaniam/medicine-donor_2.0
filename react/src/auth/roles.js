// Role → landing route. The role itself always comes from the backend
// (login / refresh response); the frontend only uses it to pick a route.
// Every API call is still authorized server-side.

export const ROLES = Object.freeze({
  PATIENT: "patient",
  DONOR: "donor",
  ADMIN: "admin",
});

export const ROLE_HOME = Object.freeze({
  [ROLES.PATIENT]: "/patient/dashboard",
  [ROLES.DONOR]: "/donor/dashboard",
  [ROLES.ADMIN]: "/admin/dashboard",
});


export function homeFor(role) {
  return ROLE_HOME[role] || "/login";
}

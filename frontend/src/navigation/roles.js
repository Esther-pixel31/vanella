// The first screen each kind of account opens on.
const HOME_ROUTES = {
  customer: 'CustomerHome',
  staff: 'StaffHome',
  driver: 'DriverHome',
  admin: 'AdminHome',
};

export function homeRouteFor(role) {
  return HOME_ROUTES[role] || 'CustomerHome';
}

// Sends the user to their role's home with no way back to the login screens.
export function goHomeFor(navigation, role) {
  navigation.reset({ index: 0, routes: [{ name: homeRouteFor(role) }] });
}

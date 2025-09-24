export let currentToken = null;
export let currentUser = null;
export let volunteers = [];
export let collects = [];

export const setAuth = (token, user) => {
  currentToken = token;
  currentUser = user;
};

export const resetState = () => {
  currentToken = null;
  currentUser = null;
  volunteers = [];
  collects = [];
}; 
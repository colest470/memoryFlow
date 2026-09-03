// Simple token store for non-React modules to read the current access token.
let accessToken = '';

export const setAccessToken = (token) => {
  accessToken = token || '';

  console.log('Access token updated in tokenStore:', accessToken);
};

export const getAccessToken = () => accessToken;

export default { setAccessToken, getAccessToken };

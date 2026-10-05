import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  token: null,
  userData: null,
  mode: 'light' as 'light' | 'dark',
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.token = action.payload.token;
      state.userData = action.payload.user;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    changeMode: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
    },
    setMode: (state, action) => {
      state.mode = action.payload;
    },
  },
});

export const { setCredentials, setToken, changeMode, setMode } = userSlice.actions;

export default userSlice.reducer;

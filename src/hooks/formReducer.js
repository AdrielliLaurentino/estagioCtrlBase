export const formReducer = (state, action) => {
  if (action.type === 'RESET') return action.payload;
  return { ...state, [action.field]: action.value };
};
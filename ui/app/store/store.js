import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { composeWithDevTools } from 'remote-redux-devtools';
import rootReducer from '../ducks';

export default function configureStore(initialState) {
  const composeEnhancers = composeWithDevTools({
    name: 'StarMask',
    hostname: 'localhost',
    port: 8100,
    realtime: Boolean(process.env.STARMASK_DEBUG),
  });
  return createStore(
    rootReducer,
    initialState,
    composeEnhancers(applyMiddleware(thunkMiddleware)),
  );
}

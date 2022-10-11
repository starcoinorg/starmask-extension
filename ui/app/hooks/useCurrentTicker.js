import { useSelector } from 'react-redux';
import {
  getRpcPrefsForCurrentProvider
} from '../selectors';

export function useCurrentTicker() {
  const rpcRefs = useSelector(getRpcPrefsForCurrentProvider);
  return rpcRefs.ticker
}

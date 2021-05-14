import { connect } from 'react-redux';
import FirstTimeFlowSwitch from './first-time-flow-switch.component';

const mapStateToProps = ({ starmask }) => {
  const {
    completedOnboarding,
    isInitialized,
    isUnlocked,
    seedPhraseBackedUp,
  } = starmask;

  return {
    completedOnboarding,
    isInitialized,
    isUnlocked,
    seedPhraseBackedUp,
  };
};

export default connect(mapStateToProps)(FirstTimeFlowSwitch);

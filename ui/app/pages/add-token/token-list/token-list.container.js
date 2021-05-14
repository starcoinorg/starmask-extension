import { connect } from 'react-redux';
import TokenList from './token-list.component';

const mapStateToProps = ({ starmask }) => {
  const { tokens } = starmask;
  return {
    tokens,
  };
};

export default connect(mapStateToProps)(TokenList);

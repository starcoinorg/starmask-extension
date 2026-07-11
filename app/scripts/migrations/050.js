import { cloneDeep } from 'lodash';

const version = 50;

/**
 * Migrate metaMetrics state to the new MetaMetrics controller
 */
export default {
  version,
  async migrate(originalVersionedData) {
    const versionedData = cloneDeep(originalVersionedData);
    versionedData.meta.version = version;

    return versionedData;
  },
};

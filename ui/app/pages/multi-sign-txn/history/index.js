import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as actions from '../../../store/actions';
import Button from '../../../components/ui/button';
import MultiSignTxnListItem from '../../../components/app/multi-sign-txn-list-item';

const PAGE_INCREMENT = 10;

class MultiSignTxnHistory extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    error: PropTypes.node,
  };

  state = { limit: PAGE_INCREMENT };

  render() {
    const { error } = this.props;
    const { limit } = this.state;
    const completedTransactions = [
      {
        "nonce": "0x3e",
        "transactions": [
          {
            "chainId": "0xfb",
            "firstRetryBlockNumber": "2341708",
            "hash": "0x37c0125ff99c13558b156a6fa2a723d93f56d714c43420184eb976cd7991f654",
            "history": [
              {
                "chainId": "0xfb",
                "id": 6925761043836921,
                "loadingDefaults": true,
                "metamaskNetworkId": {
                  "id": 251,
                  "name": "barnard"
                },
                "origin": "starmask",
                "status": "unapproved",
                "time": 1639385217418,
                "txParams": {
                  "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
                  "gas": "0x1d43f",
                  "gasPrice": "0x1",
                  "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
                  "value": "0x2540be400"
                },
                "type": "multiSignAddSign"
              },
              [
                {
                  "note": "Added new unapproved transaction.",
                  "op": "replace",
                  "path": "/loadingDefaults",
                  "timestamp": 1639385217421,
                  "value": false
                }
              ],
              [
                {
                  "note": "txStateManager: setting status to approved",
                  "op": "replace",
                  "path": "/status",
                  "timestamp": 1639385222824,
                  "value": "approved"
                }
              ],
              [
                {
                  "note": "transactions#approveTransaction",
                  "op": "add",
                  "path": "/txParams/nonce",
                  "timestamp": 1639385223667,
                  "value": "0x3e"
                },
                {
                  "op": "add",
                  "path": "/nonceDetails",
                  "value": {
                    "local": {
                      "details": {
                        "highest": 62,
                        "startPoint": 62
                      },
                      "name": "local",
                      "nonce": 62
                    },
                    "network": {
                      "details": {
                        "baseCount": 62,
                        "blockNumber": "2324904"
                      },
                      "name": "network",
                      "nonce": 62
                    },
                    "params": {
                      "highestLocallyConfirmed": 61,
                      "highestSuggested": 62,
                      "nextNetworkNonce": 62
                    }
                  }
                }
              ],
              [
                {
                  "note": "transactions#publishTransaction",
                  "op": "add",
                  "path": "/rawTx",
                  "timestamp": 1639385224097,
                  "value": "0xd7f20befd34b9f1ab8aeae98b82a5a513e0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000e40b540200000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443900fb76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa1401d656fc58e91c47ed04d6e0d349d558564282fa52473908d4e0175a488df3499f1fd8ba2e0c09c2df22f95e2551d595a1cfd768f9733dd1ef07655b470253208"
                }
              ],
              [
                {
                  "note": "transactions#setTxHash",
                  "op": "add",
                  "path": "/hash",
                  "timestamp": 1639385224419,
                  "value": "0x37c0125ff99c13558b156a6fa2a723d93f56d714c43420184eb976cd7991f654"
                }
              ],
              [
                {
                  "note": "txStateManager - add submitted time stamp",
                  "op": "add",
                  "path": "/submittedTime",
                  "timestamp": 1639385224419,
                  "value": 1639385224419
                }
              ],
              [
                {
                  "note": "txStateManager: setting status to submitted",
                  "op": "replace",
                  "path": "/status",
                  "timestamp": 1639385224420,
                  "value": "submitted"
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:block-update",
                  "op": "add",
                  "path": "/firstRetryBlockNumber",
                  "timestamp": 1639385244299,
                  "value": "2341708"
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "add",
                  "path": "/retryCount",
                  "timestamp": 1639385264670,
                  "value": 1
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639385285311,
                  "value": 2
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639385305868,
                  "value": 3
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639385326487,
                  "value": 4
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639385346979,
                  "value": 5
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639385367384,
                  "value": 6
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639385428860,
                  "value": 7
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639385675814,
                  "value": 8
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639385716885,
                  "value": 9
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639386234577,
                  "value": 10
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639386706892,
                  "value": 11
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639386732663,
                  "value": 12
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639390307847,
                  "value": 13
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639395491938,
                  "value": 14
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639405623848,
                  "value": 15
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639427137208,
                  "value": 16
                }
              ],
              [
                {
                  "note": "transactions/pending-tx-tracker#event: tx:retry",
                  "op": "replace",
                  "path": "/retryCount",
                  "timestamp": 1639438042054,
                  "value": 17
                }
              ],
              [
                {
                  "note": "txStateManager: setting status to dropped",
                  "op": "replace",
                  "path": "/status",
                  "timestamp": 1639449747308,
                  "value": "dropped"
                },
                {
                  "op": "add",
                  "path": "/replacedBy",
                  "value": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f"
                }
              ]
            ],
            "id": 6925761043836921,
            "loadingDefaults": false,
            "metamaskNetworkId": {
              "id": 251,
              "name": "barnard"
            },
            "nonceDetails": {
              "local": {
                "details": {
                  "highest": 62,
                  "startPoint": 62
                },
                "name": "local",
                "nonce": 62
              },
              "network": {
                "details": {
                  "baseCount": 62,
                  "blockNumber": "2324904"
                },
                "name": "network",
                "nonce": 62
              },
              "params": {
                "highestLocallyConfirmed": 61,
                "highestSuggested": 62,
                "nextNetworkNonce": 62
              }
            },
            "origin": "starmask",
            "rawTx": "0xd7f20befd34b9f1ab8aeae98b82a5a513e0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000e40b540200000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443900fb76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa1401d656fc58e91c47ed04d6e0d349d558564282fa52473908d4e0175a488df3499f1fd8ba2e0c09c2df22f95e2551d595a1cfd768f9733dd1ef07655b470253208",
            "replacedBy": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f",
            "retryCount": 17,
            "status": "dropped",
            "submittedTime": 1639385224419,
            "time": 1639385217418,
            "txParams": {
              "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
              "gas": "0x1d43f",
              "gasPrice": "0x1",
              "nonce": "0x3e",
              "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
              "value": "0x2540be400"
            },
            "type": "multiSignAddSign"
          },
          {
            "chainId": "0xfb",
            "hash": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f",
            "history": [
              {
                "chainId": "0xfb",
                "id": 3217741301155430,
                "lastGasPrice": "0x1",
                "loadingDefaults": false,
                "metamaskNetworkId": {
                  "id": 251,
                  "name": "barnard"
                },
                "status": "approved",
                "time": 1639449734792,
                "txParams": {
                  "data": "0x02000000000000000000000000000000010c456d707479536372697074730c656d7074795f7363726970740000",
                  "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
                  "gas": "0x1d43f",
                  "gasPrice": "0xa",
                  "nonce": "0x3e",
                  "value": "0x0"
                },
                "type": "MultiSignTxnAddSign"
              },
              [
                {
                  "note": "transactions#approveTransaction",
                  "op": "add",
                  "path": "/nonceDetails",
                  "timestamp": 1639449735514,
                  "value": {
                    "local": {
                      "details": {
                        "highest": 63,
                        "startPoint": 62
                      },
                      "name": "local",
                      "nonce": 63
                    },
                    "network": {
                      "details": {
                        "baseCount": 62,
                        "blockNumber": "2354440"
                      },
                      "name": "network",
                      "nonce": 62
                    },
                    "params": {
                      "highestLocallyConfirmed": 61,
                      "highestSuggested": 62,
                      "nextNetworkNonce": 62
                    }
                  }
                }
              ],
              [
                {
                  "note": "transactions#publishTransaction",
                  "op": "add",
                  "path": "/rawTx",
                  "timestamp": 1639449736057,
                  "value": "0xd7f20befd34b9f1ab8aeae98b82a5a513e0000000000000002000000000000000000000000000000010c456d707479536372697074730c656d7074795f73637269707400003fd40100000000000a000000000000000d3078313a3a5354433a3a5354438f0bb86100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa140a0c217d1405ab477512a6c607af41009e07c3c0cb7dc2fca48e9d79f1908a98d341b3b5c08443f5192e3524cea4c6901605a6837a9ad55d8b9c9ef30f5603902"
                }
              ],
              [
                {
                  "note": "transactions#setTxHash",
                  "op": "add",
                  "path": "/hash",
                  "timestamp": 1639449736460,
                  "value": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f"
                }
              ],
              [
                {
                  "note": "txStateManager - add submitted time stamp",
                  "op": "add",
                  "path": "/submittedTime",
                  "timestamp": 1639449736461,
                  "value": 1639449736460
                }
              ],
              [
                {
                  "note": "txStateManager: setting status to submitted",
                  "op": "replace",
                  "path": "/status",
                  "timestamp": 1639449736462,
                  "value": "submitted"
                }
              ],
              [
                {
                  "note": "txStateManager: setting status to confirmed",
                  "op": "replace",
                  "path": "/status",
                  "timestamp": 1639449747296,
                  "value": "confirmed"
                },
                {
                  "op": "add",
                  "path": "/txReceipt",
                  "value": {
                    "block_hash": "0x72725674eb5b41a3dcef7f7ae86af5c7380515489e9e3c5641da057ff193d72d",
                    "block_number": "2354442",
                    "event_root_hash": "0x414343554d554c41544f525f504c414345484f4c4445525f4841534800000000",
                    "gasUsed": "8439",
                    "gas_used": "8439",
                    "state_root_hash": "0xcb7329ecb1138b2929bbefcda4bc5b1bfb6bad8b2caeca1c1b0b210a820ace05",
                    "status": "Executed",
                    "transaction_hash": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f",
                    "transaction_index": 1
                  }
                }
              ]
            ],
            "id": 3217741301155430,
            "lastGasPrice": "0x1",
            "loadingDefaults": false,
            "metamaskNetworkId": {
              "id": 251,
              "name": "barnard"
            },
            "nonceDetails": {
              "local": {
                "details": {
                  "highest": 63,
                  "startPoint": 62
                },
                "name": "local",
                "nonce": 63
              },
              "network": {
                "details": {
                  "baseCount": 62,
                  "blockNumber": "2354440"
                },
                "name": "network",
                "nonce": 62
              },
              "params": {
                "highestLocallyConfirmed": 61,
                "highestSuggested": 62,
                "nextNetworkNonce": 62
              }
            },
            "rawTx": "0xd7f20befd34b9f1ab8aeae98b82a5a513e0000000000000002000000000000000000000000000000010c456d707479536372697074730c656d7074795f73637269707400003fd40100000000000a000000000000000d3078313a3a5354433a3a5354438f0bb86100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa140a0c217d1405ab477512a6c607af41009e07c3c0cb7dc2fca48e9d79f1908a98d341b3b5c08443f5192e3524cea4c6901605a6837a9ad55d8b9c9ef30f5603902",
            "status": "confirmed",
            "submittedTime": 1639449736460,
            "time": 1639449734792,
            "txParams": {
              "data": "0x02000000000000000000000000000000010c456d707479536372697074730c656d7074795f7363726970740000",
              "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
              "gas": "0x1d43f",
              "gasPrice": "0xa",
              "nonce": "0x3e",
              "value": "0x0"
            },
            "txReceipt": {
              "block_hash": "0x72725674eb5b41a3dcef7f7ae86af5c7380515489e9e3c5641da057ff193d72d",
              "block_number": "2354442",
              "event_root_hash": "0x414343554d554c41544f525f504c414345484f4c4445525f4841534800000000",
              "gasUsed": "8439",
              "gas_used": "8439",
              "state_root_hash": "0xcb7329ecb1138b2929bbefcda4bc5b1bfb6bad8b2caeca1c1b0b210a820ace05",
              "status": "Executed",
              "transaction_hash": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f",
              "transaction_index": 1
            },
            "type": "MultiSignTxnAddSign"
          }
        ],
        "initialTransaction": {
          "chainId": "0xfb",
          "firstRetryBlockNumber": "2341708",
          "hash": "0x37c0125ff99c13558b156a6fa2a723d93f56d714c43420184eb976cd7991f654",
          "history": [
            {
              "chainId": "0xfb",
              "id": 6925761043836921,
              "loadingDefaults": true,
              "metamaskNetworkId": {
                "id": 251,
                "name": "barnard"
              },
              "origin": "starmask",
              "status": "unapproved",
              "time": 1639385217418,
              "txParams": {
                "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
                "gas": "0x1d43f",
                "gasPrice": "0x1",
                "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
                "value": "0x2540be400"
              },
              "type": "multiSignAddSign"
            },
            [
              {
                "note": "Added new unapproved transaction.",
                "op": "replace",
                "path": "/loadingDefaults",
                "timestamp": 1639385217421,
                "value": false
              }
            ],
            [
              {
                "note": "txStateManager: setting status to approved",
                "op": "replace",
                "path": "/status",
                "timestamp": 1639385222824,
                "value": "approved"
              }
            ],
            [
              {
                "note": "transactions#approveTransaction",
                "op": "add",
                "path": "/txParams/nonce",
                "timestamp": 1639385223667,
                "value": "0x3e"
              },
              {
                "op": "add",
                "path": "/nonceDetails",
                "value": {
                  "local": {
                    "details": {
                      "highest": 62,
                      "startPoint": 62
                    },
                    "name": "local",
                    "nonce": 62
                  },
                  "network": {
                    "details": {
                      "baseCount": 62,
                      "blockNumber": "2324904"
                    },
                    "name": "network",
                    "nonce": 62
                  },
                  "params": {
                    "highestLocallyConfirmed": 61,
                    "highestSuggested": 62,
                    "nextNetworkNonce": 62
                  }
                }
              }
            ],
            [
              {
                "note": "transactions#publishTransaction",
                "op": "add",
                "path": "/rawTx",
                "timestamp": 1639385224097,
                "value": "0xd7f20befd34b9f1ab8aeae98b82a5a513e0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000e40b540200000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443900fb76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa1401d656fc58e91c47ed04d6e0d349d558564282fa52473908d4e0175a488df3499f1fd8ba2e0c09c2df22f95e2551d595a1cfd768f9733dd1ef07655b470253208"
              }
            ],
            [
              {
                "note": "transactions#setTxHash",
                "op": "add",
                "path": "/hash",
                "timestamp": 1639385224419,
                "value": "0x37c0125ff99c13558b156a6fa2a723d93f56d714c43420184eb976cd7991f654"
              }
            ],
            [
              {
                "note": "txStateManager - add submitted time stamp",
                "op": "add",
                "path": "/submittedTime",
                "timestamp": 1639385224419,
                "value": 1639385224419
              }
            ],
            [
              {
                "note": "txStateManager: setting status to submitted",
                "op": "replace",
                "path": "/status",
                "timestamp": 1639385224420,
                "value": "submitted"
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:block-update",
                "op": "add",
                "path": "/firstRetryBlockNumber",
                "timestamp": 1639385244299,
                "value": "2341708"
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "add",
                "path": "/retryCount",
                "timestamp": 1639385264670,
                "value": 1
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639385285311,
                "value": 2
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639385305868,
                "value": 3
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639385326487,
                "value": 4
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639385346979,
                "value": 5
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639385367384,
                "value": 6
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639385428860,
                "value": 7
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639385675814,
                "value": 8
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639385716885,
                "value": 9
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639386234577,
                "value": 10
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639386706892,
                "value": 11
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639386732663,
                "value": 12
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639390307847,
                "value": 13
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639395491938,
                "value": 14
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639405623848,
                "value": 15
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639427137208,
                "value": 16
              }
            ],
            [
              {
                "note": "transactions/pending-tx-tracker#event: tx:retry",
                "op": "replace",
                "path": "/retryCount",
                "timestamp": 1639438042054,
                "value": 17
              }
            ],
            [
              {
                "note": "txStateManager: setting status to dropped",
                "op": "replace",
                "path": "/status",
                "timestamp": 1639449747308,
                "value": "dropped"
              },
              {
                "op": "add",
                "path": "/replacedBy",
                "value": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f"
              }
            ]
          ],
          "id": 6925761043836921,
          "loadingDefaults": false,
          "metamaskNetworkId": {
            "id": 251,
            "name": "barnard"
          },
          "nonceDetails": {
            "local": {
              "details": {
                "highest": 62,
                "startPoint": 62
              },
              "name": "local",
              "nonce": 62
            },
            "network": {
              "details": {
                "baseCount": 62,
                "blockNumber": "2324904"
              },
              "name": "network",
              "nonce": 62
            },
            "params": {
              "highestLocallyConfirmed": 61,
              "highestSuggested": 62,
              "nextNetworkNonce": 62
            }
          },
          "origin": "starmask",
          "rawTx": "0xd7f20befd34b9f1ab8aeae98b82a5a513e0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000e40b540200000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443900fb76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa1401d656fc58e91c47ed04d6e0d349d558564282fa52473908d4e0175a488df3499f1fd8ba2e0c09c2df22f95e2551d595a1cfd768f9733dd1ef07655b470253208",
          "replacedBy": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f",
          "retryCount": 17,
          "status": "dropped",
          "submittedTime": 1639385224419,
          "time": 1639385217418,
          "txParams": {
            "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
            "gas": "0x1d43f",
            "gasPrice": "0x1",
            "nonce": "0x3e",
            "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
            "value": "0x2540be400"
          },
          "type": "multiSignAddSign"
        },
        "primaryTransaction": {
          "chainId": "0xfb",
          "hash": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f",
          "timestamp": 1639449735514,
          "history": [
            {
              "chainId": "0xfb",
              "id": 3217741301155430,
              "lastGasPrice": "0x1",
              "loadingDefaults": false,
              "metamaskNetworkId": {
                "id": 251,
                "name": "barnard"
              },
              "status": "approved",
              "time": 1639449734792,
              "txParams": {
                "data": "0x02000000000000000000000000000000010c456d707479536372697074730c656d7074795f7363726970740000",
                "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
                "gas": "0x1d43f",
                "gasPrice": "0xa",
                "nonce": "0x3e",
                "value": "0x0"
              },
              "type": "MultiSignTxnAddSign"
            },
            [
              {
                "note": "transactions#approveTransaction",
                "op": "add",
                "path": "/nonceDetails",
                "timestamp": 1639449735514,
                "value": {
                  "local": {
                    "details": {
                      "highest": 63,
                      "startPoint": 62
                    },
                    "name": "local",
                    "nonce": 63
                  },
                  "network": {
                    "details": {
                      "baseCount": 62,
                      "blockNumber": "2354440"
                    },
                    "name": "network",
                    "nonce": 62
                  },
                  "params": {
                    "highestLocallyConfirmed": 61,
                    "highestSuggested": 62,
                    "nextNetworkNonce": 62
                  }
                }
              }
            ],
            [
              {
                "note": "transactions#publishTransaction",
                "op": "add",
                "path": "/rawTx",
                "timestamp": 1639449736057,
                "value": "0xd7f20befd34b9f1ab8aeae98b82a5a513e0000000000000002000000000000000000000000000000010c456d707479536372697074730c656d7074795f73637269707400003fd40100000000000a000000000000000d3078313a3a5354433a3a5354438f0bb86100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa140a0c217d1405ab477512a6c607af41009e07c3c0cb7dc2fca48e9d79f1908a98d341b3b5c08443f5192e3524cea4c6901605a6837a9ad55d8b9c9ef30f5603902"
              }
            ],
            [
              {
                "note": "transactions#setTxHash",
                "op": "add",
                "path": "/hash",
                "timestamp": 1639449736460,
                "value": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f"
              }
            ],
            [
              {
                "note": "txStateManager - add submitted time stamp",
                "op": "add",
                "path": "/submittedTime",
                "timestamp": 1639449736461,
                "value": 1639449736460
              }
            ],
            [
              {
                "note": "txStateManager: setting status to submitted",
                "op": "replace",
                "path": "/status",
                "timestamp": 1639449736462,
                "value": "submitted"
              }
            ],
            [
              {
                "note": "txStateManager: setting status to confirmed",
                "op": "replace",
                "path": "/status",
                "timestamp": 1639449747296,
                "value": "confirmed"
              },
              {
                "op": "add",
                "path": "/txReceipt",
                "value": {
                  "block_hash": "0x72725674eb5b41a3dcef7f7ae86af5c7380515489e9e3c5641da057ff193d72d",
                  "block_number": "2354442",
                  "event_root_hash": "0x414343554d554c41544f525f504c414345484f4c4445525f4841534800000000",
                  "gasUsed": "8439",
                  "gas_used": "8439",
                  "state_root_hash": "0xcb7329ecb1138b2929bbefcda4bc5b1bfb6bad8b2caeca1c1b0b210a820ace05",
                  "status": "Executed",
                  "transaction_hash": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f",
                  "transaction_index": 1
                }
              }
            ]
          ],
          "id": 3217741301155430,
          "lastGasPrice": "0x1",
          "loadingDefaults": false,
          "metamaskNetworkId": {
            "id": 251,
            "name": "barnard"
          },
          "nonceDetails": {
            "local": {
              "details": {
                "highest": 63,
                "startPoint": 62
              },
              "name": "local",
              "nonce": 63
            },
            "network": {
              "details": {
                "baseCount": 62,
                "blockNumber": "2354440"
              },
              "name": "network",
              "nonce": 62
            },
            "params": {
              "highestLocallyConfirmed": 61,
              "highestSuggested": 62,
              "nextNetworkNonce": 62
            }
          },
          "rawTx": "0xd7f20befd34b9f1ab8aeae98b82a5a513e0000000000000002000000000000000000000000000000010c456d707479536372697074730c656d7074795f73637269707400003fd40100000000000a000000000000000d3078313a3a5354433a3a5354438f0bb86100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa140a0c217d1405ab477512a6c607af41009e07c3c0cb7dc2fca48e9d79f1908a98d341b3b5c08443f5192e3524cea4c6901605a6837a9ad55d8b9c9ef30f5603902",
          "status": "confirmed",
          "submittedTime": 1639449736460,
          "time": 1639449734792,
          "txParams": {
            "data": "0x02000000000000000000000000000000010c456d707479536372697074730c656d7074795f7363726970740000",
            "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
            "gas": "0x1d43f",
            "gasPrice": "0xa",
            "nonce": "0x3e",
            "value": "0x0"
          },
          "txReceipt": {
            "block_hash": "0x72725674eb5b41a3dcef7f7ae86af5c7380515489e9e3c5641da057ff193d72d",
            "block_number": "2354442",
            "event_root_hash": "0x414343554d554c41544f525f504c414345484f4c4445525f4841534800000000",
            "gasUsed": "8439",
            "gas_used": "8439",
            "state_root_hash": "0xcb7329ecb1138b2929bbefcda4bc5b1bfb6bad8b2caeca1c1b0b210a820ace05",
            "status": "Executed",
            "transaction_hash": "0x285316e1160e77fa907c9a98962d3b8eeb55cb64ec2e79542866d87b784f695f",
            "transaction_index": 1
          },
          "type": "MultiSignTxnAddSign"
        },
        "hasRetried": false,
        "hasCancelled": true
      },
      {
        "nonce": "0x3d",
        "transactions": [
          {
            "chainId": "0xfb",
            "err": {
              "message": "[object Object]"
            },
            "history": [
              {
                "chainId": "0xfb",
                "id": 6925761043836919,
                "loadingDefaults": true,
                "metamaskNetworkId": {
                  "id": 251,
                  "name": "barnard"
                },
                "origin": "starmask",
                "status": "unapproved",
                "time": 1639383949722,
                "txParams": {
                  "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
                  "gas": "0x1d43f",
                  "gasPrice": "0x1",
                  "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
                  "value": "0x3b9aca00"
                },
                "type": "multiSignCreate"
              },
              [
                {
                  "note": "Added new unapproved transaction.",
                  "op": "replace",
                  "path": "/loadingDefaults",
                  "timestamp": 1639383949727,
                  "value": false
                }
              ],
              [
                {
                  "note": "txStateManager: setting status to approved",
                  "op": "replace",
                  "path": "/status",
                  "timestamp": 1639383951005,
                  "value": "approved"
                }
              ],
              [
                {
                  "note": "transactions#approveTransaction",
                  "op": "add",
                  "path": "/txParams/nonce",
                  "timestamp": 1639383951615,
                  "value": "0x3d"
                },
                {
                  "op": "add",
                  "path": "/nonceDetails",
                  "value": {
                    "local": {
                      "details": {
                        "highest": 61,
                        "startPoint": 61
                      },
                      "name": "local",
                      "nonce": 61
                    },
                    "network": {
                      "details": {
                        "baseCount": 61,
                        "blockNumber": "2341451"
                      },
                      "name": "network",
                      "nonce": 61
                    },
                    "params": {
                      "highestLocallyConfirmed": 60,
                      "highestSuggested": 61,
                      "nextNetworkNonce": 61
                    }
                  }
                }
              ],
              [
                {
                  "note": "transactions#publishTransaction",
                  "op": "add",
                  "path": "/rawTx",
                  "timestamp": 1639383951937,
                  "value": "0xd7f20befd34b9f1ab8aeae98b82a5a513d0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000ca9a3b0000000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443980ab76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa140a062187a41c809cbb8a4f03fe6bd2cc5b47984be7e2c84724619c6391b4f6e48dadf8ffe0ac27ef6ff8f2e11a45dccc9094b32c65a1fd7389367d529aea3620e"
                }
              ],
              [
                {
                  "note": "transactions:tx-state-manager#fail - add error",
                  "op": "add",
                  "path": "/err",
                  "timestamp": 1639383952234,
                  "value": {
                    "message": "[object Object]"
                  }
                }
              ],
              [
                {
                  "note": "txStateManager: setting status to failed",
                  "op": "replace",
                  "path": "/status",
                  "timestamp": 1639383952235,
                  "value": "failed"
                }
              ],
              [
                {
                  "note": "txStateManager: setting status to dropped",
                  "op": "replace",
                  "path": "/status",
                  "timestamp": 1639384344980,
                  "value": "dropped"
                },
                {
                  "op": "add",
                  "path": "/replacedBy",
                  "value": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d"
                }
              ]
            ],
            "id": 6925761043836919,
            "loadingDefaults": false,
            "metamaskNetworkId": {
              "id": 251,
              "name": "barnard"
            },
            "nonceDetails": {
              "local": {
                "details": {
                  "highest": 61,
                  "startPoint": 61
                },
                "name": "local",
                "nonce": 61
              },
              "network": {
                "details": {
                  "baseCount": 61,
                  "blockNumber": "2341451"
                },
                "name": "network",
                "nonce": 61
              },
              "params": {
                "highestLocallyConfirmed": 60,
                "highestSuggested": 61,
                "nextNetworkNonce": 61
              }
            },
            "origin": "starmask",
            "rawTx": "0xd7f20befd34b9f1ab8aeae98b82a5a513d0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000ca9a3b0000000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443980ab76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa140a062187a41c809cbb8a4f03fe6bd2cc5b47984be7e2c84724619c6391b4f6e48dadf8ffe0ac27ef6ff8f2e11a45dccc9094b32c65a1fd7389367d529aea3620e",
            "replacedBy": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d",
            "status": "dropped",
            "time": 1639383949722,
            "txParams": {
              "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
              "gas": "0x1d43f",
              "gasPrice": "0x1",
              "nonce": "0x3d",
              "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
              "value": "0x3b9aca00"
            },
            "type": "multiSignCreate"
          },
          {
            "chainId": "0xfb",
            "hash": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d",
            "history": [
              {
                "chainId": "0xfb",
                "id": 6925761043836920,
                "loadingDefaults": true,
                "metamaskNetworkId": {
                  "id": 251,
                  "name": "barnard"
                },
                "origin": "starmask",
                "status": "unapproved",
                "time": 1639384293389,
                "txParams": {
                  "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
                  "gas": "0x1d43f",
                  "gasPrice": "0x1",
                  "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
                  "value": "0x3b9aca00"
                },
                "type": "multiSignCreate"
              },
              [
                {
                  "note": "Added new unapproved transaction.",
                  "op": "replace",
                  "path": "/loadingDefaults",
                  "timestamp": 1639384293393,
                  "value": false
                }
              ],
              [
                {
                  "note": "txStateManager: setting status to approved",
                  "op": "replace",
                  "path": "/status",
                  "timestamp": 1639384298622,
                  "value": "approved"
                }
              ],
              [
                {
                  "note": "transactions#approveTransaction",
                  "op": "add",
                  "path": "/txParams/nonce",
                  "timestamp": 1639384299258,
                  "value": "0x3d"
                },
                {
                  "op": "add",
                  "path": "/nonceDetails",
                  "value": {
                    "local": {
                      "details": {
                        "highest": 61,
                        "startPoint": 61
                      },
                      "name": "local",
                      "nonce": 61
                    },
                    "network": {
                      "details": {
                        "baseCount": 61,
                        "blockNumber": "2318560"
                      },
                      "name": "network",
                      "nonce": 61
                    },
                    "params": {
                      "highestLocallyConfirmed": 60,
                      "highestSuggested": 61,
                      "nextNetworkNonce": 61
                    }
                  }
                }
              ],
              [
                {
                  "note": "transactions#publishTransaction",
                  "op": "add",
                  "path": "/rawTx",
                  "timestamp": 1639384299602,
                  "value": "0xd7f20befd34b9f1ab8aeae98b82a5a513d0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000ca9a3b0000000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443f30bb76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa14041f2b3b4b708769f5cedd86d78f38563dfb66568a7545cfcf754392b1135ee89d4a1cebcb8c7a83d78757559ca81665998f372bbe62602e1ef73c1290202f702"
                }
              ],
              [
                {
                  "note": "transactions#setTxHash",
                  "op": "add",
                  "path": "/hash",
                  "timestamp": 1639384299949,
                  "value": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d"
                }
              ],
              [
                {
                  "note": "txStateManager - add submitted time stamp",
                  "op": "add",
                  "path": "/submittedTime",
                  "timestamp": 1639384299950,
                  "value": 1639384299950
                }
              ],
              [
                {
                  "note": "txStateManager: setting status to submitted",
                  "op": "replace",
                  "path": "/status",
                  "timestamp": 1639384299951,
                  "value": "submitted"
                }
              ],
              [
                {
                  "note": "txStateManager: setting status to confirmed",
                  "op": "replace",
                  "path": "/status",
                  "timestamp": 1639384344975,
                  "value": "confirmed"
                },
                {
                  "op": "add",
                  "path": "/txReceipt",
                  "value": {
                    "block_hash": "0x81cedbed2d08bda04cf26a306d68ca39b51e0de6526b92f3edac96d5397bdafa",
                    "block_number": "2341523",
                    "event_root_hash": "0xa210be8bf8c3f4b5017f44c8104c5fe83825872d4ea4b5f2b7ea8d3c3a7c9d38",
                    "gasUsed": "119871",
                    "gas_used": "119871",
                    "state_root_hash": "0x3dc57a430d931fb500e0857694a0cc3639ca85c60d9ea588cb4937dd016028e6",
                    "status": "Executed",
                    "transaction_hash": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d",
                    "transaction_index": 1
                  }
                }
              ]
            ],
            "id": 6925761043836920,
            "loadingDefaults": false,
            "metamaskNetworkId": {
              "id": 251,
              "name": "barnard"
            },
            "nonceDetails": {
              "local": {
                "details": {
                  "highest": 61,
                  "startPoint": 61
                },
                "name": "local",
                "nonce": 61
              },
              "network": {
                "details": {
                  "baseCount": 61,
                  "blockNumber": "2318560"
                },
                "name": "network",
                "nonce": 61
              },
              "params": {
                "highestLocallyConfirmed": 60,
                "highestSuggested": 61,
                "nextNetworkNonce": 61
              }
            },
            "origin": "starmask",
            "rawTx": "0xd7f20befd34b9f1ab8aeae98b82a5a513d0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000ca9a3b0000000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443f30bb76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa14041f2b3b4b708769f5cedd86d78f38563dfb66568a7545cfcf754392b1135ee89d4a1cebcb8c7a83d78757559ca81665998f372bbe62602e1ef73c1290202f702",
            "status": "confirmed",
            "submittedTime": 1639384299950,
            "time": 1639384293389,
            "txParams": {
              "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
              "gas": "0x1d43f",
              "gasPrice": "0x1",
              "nonce": "0x3d",
              "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
              "value": "0x3b9aca00"
            },
            "txReceipt": {
              "block_hash": "0x81cedbed2d08bda04cf26a306d68ca39b51e0de6526b92f3edac96d5397bdafa",
              "block_number": "2341523",
              "event_root_hash": "0xa210be8bf8c3f4b5017f44c8104c5fe83825872d4ea4b5f2b7ea8d3c3a7c9d38",
              "gasUsed": "119871",
              "gas_used": "119871",
              "state_root_hash": "0x3dc57a430d931fb500e0857694a0cc3639ca85c60d9ea588cb4937dd016028e6",
              "status": "Executed",
              "transaction_hash": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d",
              "transaction_index": 1
            },
            "type": "multiSignCreate"
          }
        ],
        "initialTransaction": {
          "chainId": "0xfb",
          "err": {
            "message": "[object Object]"
          },
          "history": [
            {
              "chainId": "0xfb",
              "id": 6925761043836919,
              "loadingDefaults": true,
              "metamaskNetworkId": {
                "id": 251,
                "name": "barnard"
              },
              "origin": "starmask",
              "status": "unapproved",
              "time": 1639383949722,
              "txParams": {
                "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
                "gas": "0x1d43f",
                "gasPrice": "0x1",
                "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
                "value": "0x3b9aca00"
              },
              "type": "multiSignCreate"
            },
            [
              {
                "note": "Added new unapproved transaction.",
                "op": "replace",
                "path": "/loadingDefaults",
                "timestamp": 1639383949727,
                "value": false
              }
            ],
            [
              {
                "note": "txStateManager: setting status to approved",
                "op": "replace",
                "path": "/status",
                "timestamp": 1639383951005,
                "value": "approved"
              }
            ],
            [
              {
                "note": "transactions#approveTransaction",
                "op": "add",
                "path": "/txParams/nonce",
                "timestamp": 1639383951615,
                "value": "0x3d"
              },
              {
                "op": "add",
                "path": "/nonceDetails",
                "value": {
                  "local": {
                    "details": {
                      "highest": 61,
                      "startPoint": 61
                    },
                    "name": "local",
                    "nonce": 61
                  },
                  "network": {
                    "details": {
                      "baseCount": 61,
                      "blockNumber": "2341451"
                    },
                    "name": "network",
                    "nonce": 61
                  },
                  "params": {
                    "highestLocallyConfirmed": 60,
                    "highestSuggested": 61,
                    "nextNetworkNonce": 61
                  }
                }
              }
            ],
            [
              {
                "note": "transactions#publishTransaction",
                "op": "add",
                "path": "/rawTx",
                "timestamp": 1639383951937,
                "value": "0xd7f20befd34b9f1ab8aeae98b82a5a513d0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000ca9a3b0000000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443980ab76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa140a062187a41c809cbb8a4f03fe6bd2cc5b47984be7e2c84724619c6391b4f6e48dadf8ffe0ac27ef6ff8f2e11a45dccc9094b32c65a1fd7389367d529aea3620e"
              }
            ],
            [
              {
                "note": "transactions:tx-state-manager#fail - add error",
                "op": "add",
                "path": "/err",
                "timestamp": 1639383952234,
                "value": {
                  "message": "[object Object]"
                }
              }
            ],
            [
              {
                "note": "txStateManager: setting status to failed",
                "op": "replace",
                "path": "/status",
                "timestamp": 1639383952235,
                "value": "failed"
              }
            ],
            [
              {
                "note": "txStateManager: setting status to dropped",
                "op": "replace",
                "path": "/status",
                "timestamp": 1639384344980,
                "value": "dropped"
              },
              {
                "op": "add",
                "path": "/replacedBy",
                "value": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d"
              }
            ]
          ],
          "id": 6925761043836919,
          "loadingDefaults": false,
          "metamaskNetworkId": {
            "id": 251,
            "name": "barnard"
          },
          "nonceDetails": {
            "local": {
              "details": {
                "highest": 61,
                "startPoint": 61
              },
              "name": "local",
              "nonce": 61
            },
            "network": {
              "details": {
                "baseCount": 61,
                "blockNumber": "2341451"
              },
              "name": "network",
              "nonce": 61
            },
            "params": {
              "highestLocallyConfirmed": 60,
              "highestSuggested": 61,
              "nextNetworkNonce": 61
            }
          },
          "origin": "starmask",
          "rawTx": "0xd7f20befd34b9f1ab8aeae98b82a5a513d0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000ca9a3b0000000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443980ab76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa140a062187a41c809cbb8a4f03fe6bd2cc5b47984be7e2c84724619c6391b4f6e48dadf8ffe0ac27ef6ff8f2e11a45dccc9094b32c65a1fd7389367d529aea3620e",
          "replacedBy": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d",
          "status": "dropped",
          "time": 1639383949722,
          "txParams": {
            "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
            "gas": "0x1d43f",
            "gasPrice": "0x1",
            "nonce": "0x3d",
            "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
            "value": "0x3b9aca00"
          },
          "type": "multiSignCreate"
        },
        "primaryTransaction": {
          "chainId": "0xfb",
          "hash": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d",
          "timestamp": 1639384293393,
          "history": [
            {
              "chainId": "0xfb",
              "id": 6925761043836920,
              "loadingDefaults": true,
              "metamaskNetworkId": {
                "id": 251,
                "name": "barnard"
              },
              "origin": "starmask",
              "status": "unapproved",
              "time": 1639384293389,
              "txParams": {
                "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
                "gas": "0x1d43f",
                "gasPrice": "0x1",
                "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
                "value": "0x3b9aca00"
              },
              "type": "multiSignCreate"
            },
            [
              {
                "note": "Added new unapproved transaction.",
                "op": "replace",
                "path": "/loadingDefaults",
                "timestamp": 1639384293393,
                "value": false
              }
            ],
            [
              {
                "note": "txStateManager: setting status to approved",
                "op": "replace",
                "path": "/status",
                "timestamp": 1639384298622,
                "value": "approved"
              }
            ],
            [
              {
                "note": "transactions#approveTransaction",
                "op": "add",
                "path": "/txParams/nonce",
                "timestamp": 1639384299258,
                "value": "0x3d"
              },
              {
                "op": "add",
                "path": "/nonceDetails",
                "value": {
                  "local": {
                    "details": {
                      "highest": 61,
                      "startPoint": 61
                    },
                    "name": "local",
                    "nonce": 61
                  },
                  "network": {
                    "details": {
                      "baseCount": 61,
                      "blockNumber": "2318560"
                    },
                    "name": "network",
                    "nonce": 61
                  },
                  "params": {
                    "highestLocallyConfirmed": 60,
                    "highestSuggested": 61,
                    "nextNetworkNonce": 61
                  }
                }
              }
            ],
            [
              {
                "note": "transactions#publishTransaction",
                "op": "add",
                "path": "/rawTx",
                "timestamp": 1639384299602,
                "value": "0xd7f20befd34b9f1ab8aeae98b82a5a513d0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000ca9a3b0000000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443f30bb76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa14041f2b3b4b708769f5cedd86d78f38563dfb66568a7545cfcf754392b1135ee89d4a1cebcb8c7a83d78757559ca81665998f372bbe62602e1ef73c1290202f702"
              }
            ],
            [
              {
                "note": "transactions#setTxHash",
                "op": "add",
                "path": "/hash",
                "timestamp": 1639384299949,
                "value": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d"
              }
            ],
            [
              {
                "note": "txStateManager - add submitted time stamp",
                "op": "add",
                "path": "/submittedTime",
                "timestamp": 1639384299950,
                "value": 1639384299950
              }
            ],
            [
              {
                "note": "txStateManager: setting status to submitted",
                "op": "replace",
                "path": "/status",
                "timestamp": 1639384299951,
                "value": "submitted"
              }
            ],
            [
              {
                "note": "txStateManager: setting status to confirmed",
                "op": "replace",
                "path": "/status",
                "timestamp": 1639384344975,
                "value": "confirmed"
              },
              {
                "op": "add",
                "path": "/txReceipt",
                "value": {
                  "block_hash": "0x81cedbed2d08bda04cf26a306d68ca39b51e0de6526b92f3edac96d5397bdafa",
                  "block_number": "2341523",
                  "event_root_hash": "0xa210be8bf8c3f4b5017f44c8104c5fe83825872d4ea4b5f2b7ea8d3c3a7c9d38",
                  "gasUsed": "119871",
                  "gas_used": "119871",
                  "state_root_hash": "0x3dc57a430d931fb500e0857694a0cc3639ca85c60d9ea588cb4937dd016028e6",
                  "status": "Executed",
                  "transaction_hash": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d",
                  "transaction_index": 1
                }
              }
            ]
          ],
          "id": 6925761043836920,
          "loadingDefaults": false,
          "metamaskNetworkId": {
            "id": 251,
            "name": "barnard"
          },
          "nonceDetails": {
            "local": {
              "details": {
                "highest": 61,
                "startPoint": 61
              },
              "name": "local",
              "nonce": 61
            },
            "network": {
              "details": {
                "baseCount": 61,
                "blockNumber": "2318560"
              },
              "name": "network",
              "nonce": 61
            },
            "params": {
              "highestLocallyConfirmed": 60,
              "highestSuggested": 61,
              "nextNetworkNonce": 61
            }
          },
          "origin": "starmask",
          "rawTx": "0xd7f20befd34b9f1ab8aeae98b82a5a513d0000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210eb9a0d1628fddba79b932ced2623b1a41000ca9a3b0000000000000000000000003fd401000000000001000000000000000d3078313a3a5354433a3a535443f30bb76100000000fb002032ed52d319694aebc5b52e00836e2f7c7d2c7c7791270ede450d21dbc90cbfa14041f2b3b4b708769f5cedd86d78f38563dfb66568a7545cfcf754392b1135ee89d4a1cebcb8c7a83d78757559ca81665998f372bbe62602e1ef73c1290202f702",
          "status": "confirmed",
          "submittedTime": 1639384299950,
          "time": 1639384293389,
          "txParams": {
            "from": "0xd7f20befd34b9f1ab8aeae98b82a5a51",
            "gas": "0x1d43f",
            "gasPrice": "0x1",
            "nonce": "0x3d",
            "to": "0xeb9a0d1628fddba79b932ced2623b1a4",
            "value": "0x3b9aca00"
          },
          "txReceipt": {
            "block_hash": "0x81cedbed2d08bda04cf26a306d68ca39b51e0de6526b92f3edac96d5397bdafa",
            "block_number": "2341523",
            "event_root_hash": "0xa210be8bf8c3f4b5017f44c8104c5fe83825872d4ea4b5f2b7ea8d3c3a7c9d38",
            "gasUsed": "119871",
            "gas_used": "119871",
            "state_root_hash": "0x3dc57a430d931fb500e0857694a0cc3639ca85c60d9ea588cb4937dd016028e6",
            "status": "Executed",
            "transaction_hash": "0xc9ebd8b3bdaa644c8c0e48ca3904e7e006cf2a2040835e91bf4402ccdb4b7a1d",
            "transaction_index": 1
          },
          "type": "multiSignCreate"
        },
        "hasRetried": false,
        "hasCancelled": false
      }
    ];

    return (
      <div className="transaction-list">
        <div className="transaction-list__transactions">
          <div className="transaction-list__completed-transactions">
            {completedTransactions.length > 0 ? (
              completedTransactions
                .slice(0, limit)
                .map((transactionGroup, index) => (
                  <MultiSignTxnListItem
                    transactionGroup={transactionGroup}
                    key={`${transactionGroup.nonce}:${limit + index - 10}`}
                  />
                ))
            ) : (
              <div className="transaction-list__empty">
                <div className="transaction-list__empty-text">
                  {t('noTransactions')}
                </div>
              </div>
            )}
            {completedTransactions.length > limit && (
              <Button
                className="transaction-list__view-more"
                type="secondary"
                rounded
              // onClick={viewMore}
              >
                View More
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    error: state.appState.warning,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    hideModal: () => {
      dispatch(actions.hideModal());
    },
    displayWarning: (warning) => dispatch(actions.displayWarning(warning)),
    importNewJsonAccount: (options) =>
      dispatch(actions.importNewAccount('JSON File', options)),
    setSelectedAddress: (address) =>
      dispatch(actions.setSelectedAddress(address)),
  };
};

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(MultiSignTxnHistory);

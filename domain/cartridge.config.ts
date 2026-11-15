import { defineCartridge } from '../src/config.js';

export const cartridgeConfig = defineCartridge({
  name: 'courseware-ops',
  version: '1.0.0',
  description: 'Inspect, review, publish, and undo changes to courseware work sets.',
  sop: [
    'Before changing state, call list_work_sets and check the ID, status, and unverified_count.',
    'When ok is false, follow remediation. Do not blindly retry mutations.',
    'For PAYMENT_REQUIRED, use cartridge_checkout if checkout_url is absent. Let the user select a product, show the payment link, and wait for payment before retrying.',
    'Retain audit_id. If the user requests cancellation, call cartridge_undo with that ID. Never undo without user intent.',
    'If a network failure leaves the outcome unknown, inspect state before retrying; intent calls are not idempotent.',
  ],
  queries: [{ name: 'list_work_sets', description: 'List your work sets for free.', table: 'work_sets', filterColumn: 'status', orderBy: 'updated_at' }],
  intents: [{
    name: 'publish_work_set', rpcName: 'rpc_publish_work_set',
    description: 'Change a work set publication state.',
    creditCostNote: '1 credit when entering published; draft/review and validation failures are free.',
    params: {
      p_set_id: { type: 'string', description: 'Work set ID.' },
      p_target_status: { type: 'string', enum: ['draft', 'review', 'published'], description: 'Desired state.' },
    },
  }],
});

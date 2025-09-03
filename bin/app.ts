#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WafRestStack } from '../lib/waf-rest-stack';

const app = new cdk.App();
new WafRestStack(app, 'WafRestStack', {
  env: { region: 'us-east-1' }, // change region if needed
});
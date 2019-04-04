#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/cdk");
import { cdkTest } from "../lib/cdkTestStack";

const app = new cdk.App();
new cdkTest(app, "cdkTest");

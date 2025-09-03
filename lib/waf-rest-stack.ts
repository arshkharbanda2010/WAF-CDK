import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class WafRestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1️⃣ Lambda handler
    const helloFn = new lambda.Function(this, 'HelloFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async () => {
          return { statusCode: 200, body: "Hello from REST API + WAF!" };
        };
      `),
    });

    // 2️⃣ REST API Gateway
    const restApi = new apigateway.RestApi(this, 'RestApi', {
      restApiName: 'DemoRestApi',
      deployOptions: {
        stageName: 'dev', // 👈 important: stage name is required
      },
    });

    // Route GET /hello → Lambda
    const helloResource = restApi.root.addResource('hello');
    helloResource.addMethod('GET', new apigateway.LambdaIntegration(helloFn));

    // 3️⃣ WAF Web ACL
    const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL', // 👈 Regional for API Gateway
      name: 'RestApiWebAcl',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'RestApiWebAcl',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 1000, // requests per 5 min per IP
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // 4️⃣ Associate WAF with REST API Stage
    new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${restApi.restApiId}/stages/${restApi.deploymentStage.stageName}`,
      webAclArn: webAcl.attrArn,
    });

    // Output API URL
    new cdk.CfnOutput(this, 'RestApiUrl', {
      value: restApi.url,
    });
  }
}

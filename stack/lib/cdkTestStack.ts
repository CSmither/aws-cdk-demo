import cdk = require("@aws-cdk/cdk");
import ecs = require("@aws-cdk/aws-ecs");
import ec2 = require("@aws-cdk/aws-ec2");
import { LoadBalancerType } from "@aws-cdk/aws-ecs";
import { LogGroup } from "@aws-cdk/aws-logs";

export class cdkTest extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    console.log("COLUMN WIDTH ===> " + process.stdout.columns);
    process.stdout.columns = 120;
    console.log("COLUMN WIDTH ===> " + process.stdout.columns);

    this.node.apply(new cdk.Tag("project", "aws-cdk-test"));

    const vpc = new ec2.VpcNetwork(this, "MyVPC", { maxAZs: 3 });

    const cluster: ecs.Cluster = new ecs.Cluster(this, "ecs-cluster", {
      clusterName: "demo",
      vpc: vpc
    });

    cluster.addCapacity("MyEC2Capacity", {
      instanceType: new ec2.InstanceType("t3.micro"),
      desiredCapacity: 1, //(new Date().getMinutes() / 10) % 2 === 1 ? 1 : 0,
      minCapacity: 0,
      replacingUpdateMinSuccessfulInstancesPercent: 0,
      resourceSignalCount: 1
    });

    let clientRepo: string;
    if (typeof process.env.CLIENT_REPO === "undefined") {
      throw new Error(
        "Docker image repo not set. Please set the CLIENT_REPO environment variable"
      );
    } else {
      clientRepo = process.env.CLIENT_REPO;
    }

    const image = ecs.ContainerImage.fromAsset(this, "Image", {
      directory: clientRepo
    });

    const service = new ecs.LoadBalancedEc2Service(this, "Service", {
      cluster: cluster,
      image: image,
      loadBalancerType: LoadBalancerType.Application,
      containerPort: 3000,
      memoryLimitMiB: 256,
      publicLoadBalancer: true,
      desiredCount: 1
    });
    const logGroup = new LogGroup(service, 'LogGroup', {
      retentionDays: 7
    });

    logGroup.newStream(service, "stream", { logStreamName: "CDK-TEST" })

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: service.loadBalancer.dnsName
    });
  }
}

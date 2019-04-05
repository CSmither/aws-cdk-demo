import cdk = require("@aws-cdk/cdk");
import ecs = require("@aws-cdk/aws-ecs");
import ec2 = require("@aws-cdk/aws-ec2");
import { VpcNetwork } from "@aws-cdk/aws-ec2";
import { DockerImageAsset } from "@aws-cdk/assets-docker";
import path = require("path");

export class cdkTest extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.node.apply(new cdk.Tag("project", "aws-cdk-test"));

    const vpc = new VpcNetwork(this, "MyVPC", { maxAZs: 2 });

    const cluster: ecs.Cluster = new ecs.Cluster(this, "ecs-cluster", {
      clusterName: "demo",
      vpc: vpc
    });

    cluster.addCapacity("MyEC2Capacity", {
      instanceType: new ec2.InstanceType("t2.micro"),
      desiredCapacity: (new Date().getMinutes() / 10) % 2 === 1 ? 1 : 0,
      minCapacity: 0,
      replacingUpdateMinSuccessfulInstancesPercent: 0
    });

    let clientRepo: string;
    if (typeof process.env.CLIENT_REPO === "undefined") {
      throw new Error(
        "Docker image repo not set. Please set the CLIENT_REPO environment variable"
      );
    } else {
      clientRepo = process.env.CLIENT_REPO;
    }
    const asset = new DockerImageAsset(this, "MyBuildImage", {
      directory: path.join(clientRepo, "client")
    });

    const service: ecs.LoadBalancedEc2Service = new ecs.LoadBalancedEc2Service(
      this,
      "ecs-demo-client-service-master",
      {
        cluster: cluster,
        desiredCount: (new Date().getMinutes() / 10) % 2 === 1 ? 1 : 0,
        memoryLimitMiB: 128,
        image: ecs.ContainerImage.fromRegistry(asset.imageUri),
        containerPort: 3000
      }
    );

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: service.loadBalancer.dnsName
    });
  }
}

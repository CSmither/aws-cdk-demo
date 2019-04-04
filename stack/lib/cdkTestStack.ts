import cdk = require("@aws-cdk/cdk");
import ecr = require("@aws-cdk/aws-ecr");
import ecs = require("@aws-cdk/aws-ecs");
import ec2 = require("@aws-cdk/aws-ec2");
import { VpcNetwork } from "@aws-cdk/aws-ec2";

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
      desiredCapacity: 1
    });

    const registry: ecr.Repository = new ecr.Repository(this, "client-repo", {
      repositoryName: "cdk-demo-client"
    });

    const service: ecs.LoadBalancedEc2Service = new ecs.LoadBalancedEc2Service(
      this,
      "ecs-demo-client-service-master",
      {
        cluster: cluster,
        desiredCount: 1,
        memoryLimitMiB: 512,
        image: ecs.ContainerImage.fromEcrRepository(registry, "master"),
        containerPort: 3000
      }
    );

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: service.loadBalancer.dnsName
    });
  }
}

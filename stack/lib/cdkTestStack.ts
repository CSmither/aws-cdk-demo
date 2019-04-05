import cdk = require("@aws-cdk/cdk");
import ecs = require("@aws-cdk/aws-ecs");
import ec2 = require("@aws-cdk/aws-ec2");
import ecr = require("@aws-cdk/aws-ecr");
import docker = require("@aws-cdk/assets-docker");
import { VpcNetwork } from "@aws-cdk/aws-ec2";
import { ContainerImage } from "@aws-cdk/aws-ecs";

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

    const repo: ecr.Repository = new ecr.Repository(this, "repo", {repositoryName:"client", retain: true})

    const image: docker.DockerImageAsset = new docker.DockerImageAsset(this, "image", {repositoryName: repo.repositoryName, directory: clientRepo})

    const nameService = new ecs.LoadBalancedEc2Service (this, 'name-service', {
      cluster: cluster,
      desiredCount: (new Date().getMinutes() / 10) % 2 === 1 ? 1 : 0,
      image: ecs.ContainerImage.fromEcrRepository(repo),
      memoryLimitMiB: 128,
      containerPort: 3000
   });

   new cdk.CfnOutput(this, "LoadBalancerDNS", {
     value: nameService.loadBalancer.dnsName
   });
  }
}

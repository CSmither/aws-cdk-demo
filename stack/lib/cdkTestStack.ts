import cdk = require("@aws-cdk/cdk");
import ecs = require("@aws-cdk/aws-ecs");
import ec2 = require("@aws-cdk/aws-ec2");
import { LoadBalancer } from "@aws-cdk/aws-elasticloadbalancing";
import { ApplicationLoadBalancer, ApplicationTargetGroup, IpAddressType, ApplicationListener } from "@aws-cdk/aws-elasticloadbalancingv2";

export class cdkTest extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.node.apply(new cdk.Tag("project", "aws-cdk-test"));

    const vpc = new ec2.VpcNetwork(this, "MyVPC", { maxAZs: 2 });

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

    const taskDefinition = new ecs.Ec2TaskDefinition(this, "TaskDef");

    const container = taskDefinition
      .addContainer("TheContainer", {
        image: ecs.ContainerImage.fromAsset(this, "EventImage", {
          directory: clientRepo
        }),
        memoryLimitMiB: 256,
        logging: new ecs.AwsLogDriver(this, "TaskLogging", {
          streamPrefix: "EventDemo"
        })
      });
    container.addPortMappings({ containerPort: 3000 });

    const service = new ecs.Ec2Service(this, "Service", {
      cluster: cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1,
      minimumHealthyPercent: 0,
      maximumPercent: 100,
      placeOnDistinctInstances: false
    });

    const lb : ApplicationLoadBalancer = new ApplicationLoadBalancer(this, "lb", {vpc: vpc, ipAddressType: IpAddressType.Ipv4, internetFacing: true})

    const targetGroup = new ApplicationTargetGroup(this,"targetGroup",{vpc:vpc, port:80})

    const listener: ApplicationListener = lb.addListener("listener", {port: 80, open:true, defaultTargetGroups: [targetGroup]})

    service.attachToApplicationTargetGroup(targetGroup)

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: lb.dnsName
    });
  }
}

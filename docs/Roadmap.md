# GreenCloud AI Roadmap

GreenCloud AI is being built to help teams understand their cloud spend, find unnecessary cost, and make better decisions about their infrastructure.

We are starting with AWS. It is important for us to make the first version useful in the real world before we try to support every cloud provider or every possible optimization. The first goal is simple: a team should be able to connect an AWS account, understand its spending, find useful opportunities, and turn those opportunities into work that can be reviewed by the right people.

This roadmap explains the path we plan to take. It will continue to improve as we learn from users and test the product with real AWS accounts.

## Phase 1: AWS connection and cost visibility

The first phase is about giving users a reliable view of their AWS environment.

An administrator will be able to connect an AWS account using a read only IAM role. GreenCloud will use temporary access to collect the required information. Users will not need to share permanent AWS access keys, and GreenCloud will not make changes to their AWS resources during setup.

Once an account is connected, the dashboard will show total AWS cost, daily and monthly trends, spending by service, region, account, and available tags such as team, product, owner, or environment. It will also show when the data was last updated, so users know how current the information is.

This phase will also introduce the first resource inventory. Users will be able to browse EC2 instances, EBS volumes, and Elastic IP addresses, along with their region, current state, and available tags.

The purpose of this phase is to answer the basic questions clearly. What are we spending? Where is the spend coming from? Which resources are part of that spend?

## Phase 2: Savings opportunities

Once cost and resource data are available, GreenCloud will begin identifying opportunities that teams can review.

The first recommendations will focus on common sources of cloud waste. These include EBS volumes that are not attached to an instance, Elastic IP addresses that are not associated with a resource, and EC2 instances that appear to have very low usage over a meaningful period.

Each recommendation will show the AWS resource involved, the estimated monthly savings, the data used to identify the opportunity, the time period checked, and the assumptions behind the estimate. It will also explain the level of confidence in the recommendation and any risk that should be considered before acting.

The purpose is not to generate a large number of alerts. It is to give teams a short list of opportunities that are clear enough to investigate and useful enough to act on.

## Phase 3: Review and team workflow

Cloud changes need context. A resource that looks unused may still be important to a team, a deployment, or an upcoming project.

In this phase, users will be able to review recommendations inside GreenCloud. They can claim an item, add notes, approve it for action, dismiss it, or mark it as no longer relevant. GreenCloud will keep a history of these decisions so teams can understand what happened and why.

The first action integrations will create a GitHub Issue or Jira ticket from an approved recommendation. The ticket will include the resource details, estimated savings, evidence, and a link back to GreenCloud.

GreenCloud will not directly stop, resize, or delete AWS resources in this phase. The team that owns the infrastructure remains in control of the change.

## Phase 4: Better cost management

After the main workflow is stable, we will add more detailed AWS billing support.

This includes AWS Cost and Usage Report integration, better allocation of costs through tags and account structure, tag coverage reporting, and a clearer view of spending that is not assigned to a team or product.

We also plan to add cost anomaly detection, budget tracking, and support for analysing Savings Plans and Reserved Instances. These features will help teams move beyond finding individual unused resources and start planning cloud spending more effectively.

## Phase 5: More optimization and carbon insight

The next stage is broader optimization coverage.

GreenCloud will add more AWS opportunities, such as underused compute, old snapshots, unused storage, non production scheduling, storage tiering, database optimization, and networking cost review.

We also want to include carbon insight. This work will start carefully with provider data and clearly described estimates. Carbon reporting should help users understand the impact of their cloud usage, but it should always show where the data came from and what limitations apply.

## Phase 6: Safer automation

Some teams will eventually want help turning approved recommendations into infrastructure changes.

Before direct automation is considered, GreenCloud will support safer workflows such as Terraform pull requests. This allows teams to review a proposed change through their existing engineering process.

Any direct automation in the future will be optional. It will require separate permissions, explicit approval, policy checks, and monitoring after the change. GreenCloud should never make an infrastructure change without a clear and controlled process.

## Phase 7: Beyond AWS

AWS is where GreenCloud begins. When the AWS product is stable and useful, we plan to expand to Azure and Google Cloud.

Over time, GreenCloud should also support Kubernetes cost allocation, shared cloud cost views, deeper workflow integrations, enterprise identity features, and reporting for larger organizations.

## What we want GreenCloud to be

GreenCloud should make cloud cost information easier to understand and easier to act on. It should give FinOps teams, engineers, and leaders the same view of the problem, with enough context for each person to make a good decision.

We do not want users to trust a us blindly so, every recommendation should have a reason behind it. Every cost figure should have a source. Every action should be visible to the people responsible for the infrastructure.

Feedback from cloud engineers, FinOps teams, developers, and sustainability teams will shape this roadmap. If there is a cloud cost problem you want GreenCloud to solve, please share it through GitHub Issues or Discussions.

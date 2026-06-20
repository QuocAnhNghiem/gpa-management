// GPA Management AWS/EKS Pipeline
// Staging: branch staging or DEPLOY_ENV=staging
// Production: branch main, git tag v*, or DEPLOY_ENV=prod, with manual approval

NODEJS_TOOL = env.NODEJS_TOOL ?: 'system'
AWS_REGION = env.AWS_REGION ?: 'ap-southeast-1'
PROJECT_NAME = env.PROJECT_NAME ?: 'gpa-management'
EKS_CLUSTER_NAME = env.EKS_CLUSTER_NAME ?: 'gpa-management'
DEPLOY_ENV = env.DEPLOY_ENV ?: inferEnvironment()

def inferEnvironment() {
    if (env.TAG_NAME?.startsWith('v')) {
        return 'prod'
    }
    if (env.BRANCH_NAME == 'main' || env.GIT_BRANCH == 'origin/main' || env.GIT_BRANCH == 'main') {
        return 'prod'
    }
    return 'staging'
}

def envConfig(String deployEnv) {
    if (deployEnv == 'prod' || deployEnv == 'production') {
        return [
            name: 'prod',
            namespace: 'gpa-prod',
            apiUrl: env.PROD_API_URL,
            viteApiUrl: env.PROD_API_URL,
            frontendBucket: env.PROD_FRONTEND_BUCKET,
            uploadBucket: env.PROD_UPLOAD_BUCKET,
            uploadAssetsDomain: env.PROD_UPLOAD_ASSETS_DOMAIN,
            cloudfrontId: env.PROD_CLOUDFRONT_DISTRIBUTION_ID,
            imageTag: env.TAG_NAME ?: env.GIT_COMMIT,
            scanExitCode: '1'
        ]
    }

    return [
        name: 'staging',
        namespace: 'gpa-staging',
        apiUrl: env.STAGING_API_URL,
        viteApiUrl: env.STAGING_API_URL,
        frontendBucket: env.STAGING_FRONTEND_BUCKET,
        uploadBucket: env.STAGING_UPLOAD_BUCKET,
        uploadAssetsDomain: env.STAGING_UPLOAD_ASSETS_DOMAIN,
        cloudfrontId: env.STAGING_CLOUDFRONT_DISTRIBUTION_ID,
        imageTag: env.GIT_COMMIT?.take(12) ?: env.BUILD_NUMBER,
        scanExitCode: '0'
    ]
}

def withNodeTool(Closure body) {
    if (NODEJS_TOOL == 'system') {
        body()
        return
    }

    def nodeHome = tool name: NODEJS_TOOL, type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
    withEnv(["PATH=${nodeHome}/bin:${env.PATH}"]) {
        body()
    }
}

def requireEnv(String key, String value) {
    if (!value?.trim()) {
        error("Missing required environment variable: ${key}")
    }
}

def runBackendTests() {
    withNodeTool {
        dir('source/backend') {
            sh 'npm ci'
            sh 'npm test'
        }
    }
}

def runFrontendBuild(String viteApiUrl) {
    requireEnv('VITE_API_URL', viteApiUrl)
    withNodeTool {
        dir('source/frontend') {
            sh 'npm ci'
            sh "VITE_API_URL='${viteApiUrl}' npm run build"
        }
    }
}

def scanBackendImage(String ecrRepo, String imageTag, String scanExitCode) {
    sh """
        docker run --rm \
          -v /var/run/docker.sock:/var/run/docker.sock \
          aquasec/trivy:latest image \
          --severity HIGH,CRITICAL \
          --exit-code ${scanExitCode} \
          --no-progress \
          ${ecrRepo}:${imageTag}
    """
}

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        AWS_REGION = "${AWS_REGION}"
        PROJECT_NAME = "${PROJECT_NAME}"
        EKS_CLUSTER_NAME = "${EKS_CLUSTER_NAME}"
    }

    stages {
        stage('Resolve Environment') {
            steps {
                script {
                    CFG = envConfig(DEPLOY_ENV)
                    requireEnv('ECR_REPO', env.ECR_REPO)
                    requireEnv('AWS_ACCOUNT_ID', env.AWS_ACCOUNT_ID)
                    requireEnv('DOMAIN_NAME', env.DOMAIN_NAME)
                    requireEnv("${CFG.name.toUpperCase()}_API_URL", CFG.apiUrl)
                    requireEnv("${CFG.name.toUpperCase()}_FRONTEND_BUCKET", CFG.frontendBucket)
                    requireEnv("${CFG.name.toUpperCase()}_UPLOAD_BUCKET", CFG.uploadBucket)
                    requireEnv("${CFG.name.toUpperCase()}_UPLOAD_ASSETS_DOMAIN", CFG.uploadAssetsDomain)
                    requireEnv("${CFG.name.toUpperCase()}_CLOUDFRONT_DISTRIBUTION_ID", CFG.cloudfrontId)

                    echo """
                    Deploy environment: ${CFG.name}
                    Namespace: ${CFG.namespace}
                    API URL: ${CFG.apiUrl}
                    Image tag: ${CFG.imageTag}
                    """
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Tests') {
            steps {
                script {
                    runBackendTests()
                }
            }
        }

        stage('Frontend Build') {
            steps {
                script {
                    runFrontendBuild(CFG.viteApiUrl)
                }
            }
        }

        stage('Build Backend Image') {
            steps {
                sh "docker build -t gpa-backend:${CFG.imageTag} source/backend"
            }
        }

        stage('Security Scan') {
            steps {
                script {
                    scanBackendImage('gpa-backend', CFG.imageTag, CFG.scanExitCode)
                }
            }
        }

        stage('Push Backend Image to ECR') {
            steps {
                sh """
                    REGISTRY='${env.AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com'
                    aws ecr get-login-password --region '${AWS_REGION}' | docker login --username AWS --password-stdin "\$REGISTRY"
                    docker tag 'gpa-backend:${CFG.imageTag}' '${env.ECR_REPO}:${CFG.imageTag}'
                    docker push '${env.ECR_REPO}:${CFG.imageTag}'
                """
            }
        }

        stage('Production Approval') {
            when {
                expression { CFG.name == 'prod' }
            }
            steps {
                input message: "Deploy ${CFG.imageTag} to production?", ok: 'Deploy'
            }
        }

        stage('Deploy Backend/Worker to EKS') {
            steps {
                sh """
                    mkdir -p "\$WORKSPACE/.kube"
                    export KUBECONFIG="\$WORKSPACE/.kube/config"
                    aws eks update-kubeconfig --name '${EKS_CLUSTER_NAME}' --region '${AWS_REGION}'
                    ENVIRONMENT='${CFG.name}' \
                    ECR_REPO='${env.ECR_REPO}' \
                    IMAGE_TAG='${CFG.imageTag}' \
                    AWS_ACCOUNT_ID='${env.AWS_ACCOUNT_ID}' \
                    DOMAIN_NAME='${env.DOMAIN_NAME}' \
                    UPLOAD_BUCKET='${CFG.uploadBucket}' \
                    UPLOAD_ASSETS_DOMAIN='${CFG.uploadAssetsDomain}' \
                    scripts/deploy/deploy-k8s.sh
                """
            }
        }

        stage('Deploy Frontend to S3/CloudFront') {
            steps {
                sh """
                    FRONTEND_BUCKET='${CFG.frontendBucket}' \
                    CLOUDFRONT_DISTRIBUTION_ID='${CFG.cloudfrontId}' \
                    VITE_API_URL='${CFG.viteApiUrl}' \
                    scripts/deploy/deploy-frontend-s3.sh
                """
            }
        }

        stage('Smoke Test') {
            steps {
                sh """
                    API_URL='${CFG.apiUrl}' \
                    scripts/deploy/smoke-test.sh
                """
            }
        }
    }

    post {
        success {
            echo "Deploy success: ${CFG?.name ?: DEPLOY_ENV} ${CFG?.imageTag ?: ''}"
        }
        failure {
            echo "Deploy failed. Check Jenkins console output and Kubernetes events/logs."
        }
        always {
            echo 'Skipping automatic destructive cleanup. Use dedicated cleanup steps when needed.'
        }
    }
}

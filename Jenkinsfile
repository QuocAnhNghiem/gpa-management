// GPA Management AWS/EKS Pipeline
// Staging: branch staging or DEPLOY_ENV=staging
// Production: branch main, git tag v*, or DEPLOY_ENV=prod, with manual approval

def inferEnvironment() {
    if (env.TAG_NAME?.startsWith('v')) {
        return 'prod'
    }
    if (env.BRANCH_NAME == 'main' || env.GIT_BRANCH == 'origin/main' || env.GIT_BRANCH == 'main') {
        return 'prod'
    }
    return 'staging'
}

def cfgValue(String key, String defaultValue = '') {
    def paramValue = params[key]
    if (paramValue != null && "${paramValue}".trim()) {
        return "${paramValue}".trim()
    }

    def envValue = env[key]
    if (envValue != null && "${envValue}".trim()) {
        return "${envValue}".trim()
    }

    return defaultValue
}

def envConfig(String deployEnv) {
    if (deployEnv == 'prod' || deployEnv == 'production') {
        return [
            name: 'prod',
            namespace: 'gpa-prod',
            apiUrl: cfgValue('PROD_API_URL'),
            viteApiUrl: cfgValue('PROD_API_URL'),
            frontendBucket: cfgValue('PROD_FRONTEND_BUCKET'),
            uploadBucket: cfgValue('PROD_UPLOAD_BUCKET'),
            uploadAssetsDomain: cfgValue('PROD_UPLOAD_ASSETS_DOMAIN'),
            cloudfrontId: cfgValue('PROD_CLOUDFRONT_DISTRIBUTION_ID'),
            imageTag: env.TAG_NAME ?: env.GIT_COMMIT,
            scanExitCode: '1'
        ]
    }

    return [
        name: 'staging',
        namespace: 'gpa-staging',
        apiUrl: cfgValue('STAGING_API_URL'),
        viteApiUrl: cfgValue('STAGING_API_URL'),
        frontendBucket: cfgValue('STAGING_FRONTEND_BUCKET'),
        uploadBucket: cfgValue('STAGING_UPLOAD_BUCKET'),
        uploadAssetsDomain: cfgValue('STAGING_UPLOAD_ASSETS_DOMAIN'),
        cloudfrontId: cfgValue('STAGING_CLOUDFRONT_DISTRIBUTION_ID'),
        imageTag: env.GIT_COMMIT?.take(12) ?: env.BUILD_NUMBER,
        scanExitCode: '0'
    ]
}

def withNodeTool(Closure body) {
    def nodejsTool = cfgValue('NODEJS_TOOL', 'system')

    if (nodejsTool == 'system') {
        body()
        return
    }

    def nodeHome = tool name: nodejsTool, type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
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

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['staging', 'prod'], description: 'staging deploys staging; prod deploys production with manual approval')
        string(name: 'AWS_REGION', defaultValue: 'ap-southeast-1', description: 'AWS region')
        string(name: 'AWS_ACCOUNT_ID', defaultValue: '813935521170', description: 'AWS account ID')
        string(name: 'DOMAIN_NAME', defaultValue: 'nghiemquocanh.me', description: 'Root domain')
        string(name: 'EKS_CLUSTER_NAME', defaultValue: 'gpa-management', description: 'EKS cluster name')
        string(name: 'ECR_REPO', defaultValue: '813935521170.dkr.ecr.ap-southeast-1.amazonaws.com/gpa-management-backend', description: 'Backend ECR repo URL')
        string(name: 'NODEJS_TOOL', defaultValue: 'system', description: 'Use system Node.js installed on Jenkins EC2')

        string(name: 'STAGING_API_URL', defaultValue: 'https://staging-api.nghiemquocanh.me', description: 'Staging API URL')
        string(name: 'STAGING_FRONTEND_BUCKET', defaultValue: 'gpa-management-staging-frontend-813935521170-ap-southeast-1-an', description: 'Staging frontend S3 bucket')
        string(name: 'STAGING_UPLOAD_BUCKET', defaultValue: 'gpa-management-shared-uploads-813935521170-ap-southeast-1-an', description: 'Staging upload S3 bucket')
        string(name: 'STAGING_UPLOAD_ASSETS_DOMAIN', defaultValue: 'https://gpa-management-shared-uploads-813935521170-ap-southeast-1-an.s3.ap-southeast-1.amazonaws.com', description: 'Staging upload public base URL')
        string(name: 'STAGING_CLOUDFRONT_DISTRIBUTION_ID', defaultValue: 'E2C8SH021V74FV', description: 'Staging frontend CloudFront distribution ID')

        string(name: 'PROD_API_URL', defaultValue: 'https://api.nghiemquocanh.me', description: 'Production API URL')
        string(name: 'PROD_FRONTEND_BUCKET', defaultValue: 'gpa-management-prod-frontend-813935521170-ap-southeast-1-an', description: 'Production frontend S3 bucket')
        string(name: 'PROD_UPLOAD_BUCKET', defaultValue: 'gpa-management-shared-uploads-813935521170-ap-southeast-1-an', description: 'Production upload S3 bucket')
        string(name: 'PROD_UPLOAD_ASSETS_DOMAIN', defaultValue: 'https://gpa-management-shared-uploads-813935521170-ap-southeast-1-an.s3.ap-southeast-1.amazonaws.com', description: 'Production upload public base URL')
        string(name: 'PROD_CLOUDFRONT_DISTRIBUTION_ID', defaultValue: '', description: 'Production frontend CloudFront distribution ID, fill after production CloudFront exists')
    }

    stages {
        stage('Resolve Environment') {
            steps {
                script {
                    DEPLOY_TARGET = cfgValue('DEPLOY_ENV', inferEnvironment())
                    AWS_REGION_VALUE = cfgValue('AWS_REGION', 'ap-southeast-1')
                    AWS_ACCOUNT_ID_VALUE = cfgValue('AWS_ACCOUNT_ID')
                    DOMAIN_NAME_VALUE = cfgValue('DOMAIN_NAME')
                    ECR_REPO_VALUE = cfgValue('ECR_REPO')
                    EKS_CLUSTER_NAME_VALUE = cfgValue('EKS_CLUSTER_NAME', 'gpa-management')

                    CFG = envConfig(DEPLOY_TARGET)
                    requireEnv('ECR_REPO', ECR_REPO_VALUE)
                    requireEnv('AWS_ACCOUNT_ID', AWS_ACCOUNT_ID_VALUE)
                    requireEnv('DOMAIN_NAME', DOMAIN_NAME_VALUE)
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
                    REGISTRY='${AWS_ACCOUNT_ID_VALUE}.dkr.ecr.${AWS_REGION_VALUE}.amazonaws.com'
                    aws ecr get-login-password --region '${AWS_REGION_VALUE}' | docker login --username AWS --password-stdin "\$REGISTRY"
                    docker tag 'gpa-backend:${CFG.imageTag}' '${ECR_REPO_VALUE}:${CFG.imageTag}'
                    docker push '${ECR_REPO_VALUE}:${CFG.imageTag}'
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
                    aws eks update-kubeconfig --name '${EKS_CLUSTER_NAME_VALUE}' --region '${AWS_REGION_VALUE}'
                    ENVIRONMENT='${CFG.name}' \
                    ECR_REPO='${ECR_REPO_VALUE}' \
                    IMAGE_TAG='${CFG.imageTag}' \
                    AWS_ACCOUNT_ID='${AWS_ACCOUNT_ID_VALUE}' \
                    DOMAIN_NAME='${DOMAIN_NAME_VALUE}' \
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

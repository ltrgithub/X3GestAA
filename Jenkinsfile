#!groovy

node {
    withEnv(["CI_DEST=${WORKSPACE}/tmp/customer_image", "SYRACUSE_IMAGE=x3-syracuse-etna"]) {
        env.SYRACUSE_RELEASE = 'stage'
        def tag
        if("${BRANCH_NAME}" == 'integration') {
            tag = 'latest'
            env.SYRACUSE_RELEASE = '2.999'
        } else {
            if ("${BRANCH_NAME}" =~ /^release\//) {
                tag = "${BRANCH_NAME}".split('/')[1]
                env.SYRACUSE_RELEASE = tag
            }
        }
        withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'sagex3ci', usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD']]) {
            docker.image('node:6').inside {
                sh ('echo "https://$GIT_USERNAME:$GIT_PASSWORD@github.com" >> ~/.git-credentials && git config --replace-all --global credential.https://github.com/Sage-ERP-X3/Syracuse.git sagex3ci && git config --replace-all --global credential.helper store --file')
                stage('Build customer image') {
                    checkout scm
                    sh ('git submodule update --init')
                    sh ('if [ "$(ls -l ${CI_DEST}/syracuse)" ]; then rm -R "${CI_DEST}/syracuse"; fi;')
                    sh ('node apatch direct --image ${CI_DEST}/syracuse --desc "${BRANCH_NAME} build ${BUILD_ID} of $(date +%Y-%m-%d)" --release "${SYRACUSE_RELEASE}.${BUILD_ID}" --no-check --symbols DOCKER')
                }
            }
        }
        docker.withRegistry('https://repository.sagex3.com', 'jenkins_platform') {
            def syrImage
            def scmSuperv
            def scmX3
            def buildRandom = sh(script: 'echo $(cat /dev/urandom | tr -cd "a-f0-9" | head -c 10)', returnStdout: true).substring(0,9)
            stage('Build docker image') {
                sh('mkdir -p ${CI_DEST}/syracuse/shadow-modules/linux-x64-v8-5.1')
                sh('cp -R ${WORKSPACE}/shadow-modules/linux-x64-v8-5.1 ${CI_DEST}/syracuse/shadow-modules/')
                sh('cp -R ${WORKSPACE}/docker ${CI_DEST}/syracuse')
                sh('cp ${WORKSPACE}/nodelocal* ${CI_DEST}/syracuse')
                syrImage = docker.build("${SYRACUSE_IMAGE}:stage_${BUILD_ID}_${buildRandom}", '-f tmp/customer_image/syracuse/docker/Dockerfile-syr-etna \
                    --build-arg "https_proxy=${HTTP_PROXY}" \
                    --build-arg "http_proxy=${HTTPS_PROXY}" \
                    --build-arg "SYRACUSE_SRC=syracuse" \
                    "${CI_DEST}/"')
            }
            stage('Test image') {
                docker.image('mongo:3.2').withRun('--hostname="mongodb"') {mongo ->
                    syrImage.inside("--link=${mongo.id}") {
                        sh('cp -R devLic /syracuse/ && cp nodelocal-docker-test.js /syracuse/nodelocal.js && cd /syracuse && node nanny install 8124 2 && node nanny check 1200')
                    }
                }
            }
            stage('Build SCM artefacts') {
                scmSuperv = docker.build("scm-extension-superv:stage_${BUILD_ID}_${buildRandom}", '-f artefacts/scm/Dockerfile-scm-extension-superv . ')            
                scmSuperv = docker.build("scm-extension-x3:stage_${BUILD_ID}_${buildRandom}", '-f artefacts/scm/Dockerfile-scm-extension-x3 . ')            
            }
            if (tag) {
                stage('Push image') {
                    syrImage.push(tag)
                    scmSuperv.push(tag)
                    scmX3.push(tag)
                }
            }
        }
    }
}

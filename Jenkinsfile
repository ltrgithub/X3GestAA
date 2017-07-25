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

				// The first time we launch this command on a new Branch, its failed: The repo doesn't exists yet.
				def gitPreviousCommit = null
				if ( fileExists( '${WORKSPACE}/Jenkinsfile' )) {
								gitPreviousCommit = sh(returnStdout: true, script: 'git rev-parse HEAD^').trim()
				}


        withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'sagex3ci', usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD']]) {
            docker.image('node:6').inside {
                sh ('echo "https://$GIT_USERNAME:$GIT_PASSWORD@github.com" >> ~/.git-credentials && git config --replace-all --global credential.https://github.com/Sage-ERP-X3/Syracuse.git sagex3ci && git config --replace-all --global credential.helper store --file')
                stage('Checkout source code') {
                    checkout scm
                    sh ('git submodule update --init')
                }
                stage('Security check: retire.js / Node Security Project') {
                    sh('npm install -g retire')
                    sh('npm run security:retire-linux || exit 0')
                    step([$class: 'WarningsPublisher', canComputeNew: false, canResolveRelativePaths: false, consoleParsers: [[parserName: 'Node Security Project Vulnerabilities'], [parserName: 'RetireJS']], failedTotalAll: '1000', usePreviousBuildAsReference: false, defaultEncoding: '', excludePattern: '', healthy: '', includePattern: '', messagesPattern: '', unHealthy: ''])
                    if (currentBuild.result == "FAILURE") {
                        error("Build failed because of security check failure. Please review RetireJS and Node Security Project Logs then fix the isuues or edit the .retireignore.json file to add exceptions.")
                    }
                }
                stage('Build customer image') {
                    sh ('if [ "$(ls -l ${CI_DEST}/syracuse)" ]; then rm -R "${CI_DEST}/syracuse"; fi;')
                    sh ('node apatch direct --image ${CI_DEST}/syracuse --desc "${BRANCH_NAME} build ${BUILD_ID} of $(date +%Y-%m-%d)" --release "${SYRACUSE_RELEASE}.${BUILD_ID}" --no-check --symbols DOCKER')
                }
            }
        }
			
			//
			// Build Changelog.log
			//
				stage('Build ChangeLog') {
							sh ('cd ${WORKSPACE}');
							if ( gitPreviousCommit == null) {
								gitPreviousCommit = sh(returnStdout: true, script: 'git rev-parse HEAD^').trim()
							}

							gitCommit = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()

							sh ("if [! -e changelog.log]; then echo ' ' > changelog.log;  fi");

							sh ("if [-e changelog.log]; then mv changelog.log changelogtmp.log; fi");

							sh ('echo Syracuse Customer Image ${BRANCH_NAME} ${BUILD_DISPLAY_NAME} ${BUILD_ID} $(date +"%Y-%m-%d %H:%M:%S") > "${WORKSPACE}/changelog.log"');
							sh ("echo ' ' >> changelog.log");
							sh ("git log --date-order --reverse --no-merges ${gitPreviousCommit}..${gitCommit} >> changelog.log");

							sh ('cd "${WORKSPACE}"');
							sh ("echo ' ' >> changelog.log");
							sh ('more "${WORKSPACE}/changelogtmp.log" >> "${WORKSPACE}/changelog.log"');
							sh ('rm -f "${WORKSPACE}/changelogtmp.log"');

							// For information:
							sh ("echo 'gitPreviousCommit: ${gitPreviousCommit} - gitCommit: ${gitCommit}'");
							sh ("echo 'changelog.log contains: '");
							sh ("cat changelog.log");
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
            stage('Test image start') {
                docker.image('mongo:3.2').withRun('--hostname="mongodb"') {mongo ->
                    syrImage.inside("--link=${mongo.id}") {
                        sh('cp -R devLic /syracuse/ && cp nodelocal-docker-test.js /syracuse/nodelocal.js && cd /syracuse && node nanny install 8124 2 && node nanny check 1200')
                    }
                }
            }
            stage('Run unit tests') {
                docker.image('mongo:3.2').withRun('--hostname="mongodb"') {mongo ->
                    syrImage.inside("--link=${mongo.id}") {
                        sh('cp -R devLic /syracuse/ && cp nodelocal-docker-test.js /syracuse/nodelocal.js')
                        sh('cp -R node_modules/@sage/syracuse-lib/test /syracuse/node_modules/@sage/syracuse-lib/')
                        sh('cp -R node_modules/test-contract /syracuse/node_modules/')
                        sh('npm install -g mocha')
                        sh('npm install -g mocha-jenkins-reporter')
                        sh('export JUNIT_REPORT_PATH=$(pwd)/test_report.xml && cd /syracuse/node_modules/@sage/syracuse-lib && npm run test:jenkins || exit 0')
                    }
                }
                step([$class: 'XUnitBuilder', thresholds: [[$class: 'FailedThreshold', failureThreshold: '0']], tools: [[$class: 'JUnitType', pattern: 'test_report.xml']]])
            }
            stage('Run UI tests and code coverage report') {
                docker.image('node:6').inside {
                    sh ('cd node_modules/@sage/syracuse-react && npm prune && npm install && npm run test')
                    step([  $class: 'XUnitBuilder', 
                            thresholds: [[$class: 'FailedThreshold', failureThreshold: '0']], 
                            tools: [[$class: 'JUnitType', pattern: 'node_modules/@sage/syracuse-react/junit/junit.xml']]
                    ])
                            
                    step([  $class: 'CloverPublisher', 
                            cloverReportDir: 'node_modules/@sage/syracuse-react/coverage',
                            cloverReportFileName: 'clover.xml',
                            healthyTarget: [methodCoverage: 70, conditionalCoverage: 80, statementCoverage: 80],
                            unhealthyTarget: [methodCoverage: 50, conditionalCoverage: 50, statementCoverage: 50],
                            failingTarget: [methodCoverage: 0, conditionalCoverage: 0, statementCoverage: 0]
                    ])
                }
            }

            if ((currentBuild.result == null) || (currentBuild.result == "SUCCESS")) {
                stage('Build SCM artefacts') {
                    scmSuperv = docker.build("scm-extension-superv:stage_${BUILD_ID}_${buildRandom}", '-f artefacts/scm/Dockerfile-scm-extension-superv . ')            
                    scmX3 = docker.build("scm-extension-x3:stage_${BUILD_ID}_${buildRandom}", '-f artefacts/scm/Dockerfile-scm-extension-x3 . ')            
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
}

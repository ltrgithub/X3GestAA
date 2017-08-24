#!groovy
/*node {
 checkout scm
}*/

pipeline {
   agent none
   
   stages {
    stage('Auto-QLF') {	
        when {
            branch 'integration'
            expression {
                currentBuild.result == null || currentBuild.result == 'SUCCESS' 
            }
        }
        steps {
			echo "Running ${env.BUILD_ID} on ${env.JENKINS_URL}"
            echo 'Auto-QLF'
        }
            
    }
	stage('Auto-WebDriver') {
        steps {
			echo 'Auto-Webdriver'
        }             
    }
   }
   post {
        always {
            echo 'post always'  
        }
        failure {
            echo 'Failure'   
        }
        unstable {
            echo 'Unstable'    
        }
   }   
}



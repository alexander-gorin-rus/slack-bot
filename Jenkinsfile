#!Groovy
pipeline {
    agent none
    stages {
        stage('Show branch') {
            agent {node {label 'hetzner-agent-1' }}
            steps {
                echo "GIT_BRANCH is ${env.GIT_BRANCH}"
            }
        }
        stage('Deploy to staging') {
            agent {node {label 'hetzner-agent-1' }}
            when {
                expression {
                    return env.GIT_BRANCH == "origin/staging"
                }
            }
            steps {
                updateGitlabCommitStatus name: 'build', state: 'pending'
                sh label: 'Stop service', script: 'ssh -o StrictHostKeyChecking=no ubuntu@54.144.247.254 "sudo service chatbot-staging stop"'
                sh label: 'Sync files', script: 'rsync -avz -e "ssh -o StrictHostKeyChecking=no"  --exclude-from=.rsyncignore ./ ubuntu@54.144.247.254:/home/ubuntu/chatbot_staging'
                sh label: 'Install dependency', script: 'ssh -o StrictHostKeyChecking=no ubuntu@54.144.247.254 "cd /home/ubuntu/chatbot_staging && npm i"'
                sh label: 'Run migration', script: 'ssh -o StrictHostKeyChecking=no ubuntu@54.144.247.254 "cd /home/ubuntu/chatbot_staging && npm run start:migrate"'
                sh label: 'Start service', script: 'ssh -o StrictHostKeyChecking=no ubuntu@54.144.247.254 "sudo service chatbot-staging start"'
                updateGitlabCommitStatus name: 'build', state: 'success'
            }
        }
        stage('Deploy to production') {
            agent {node {label 'hetzner-agent-1' }}
            when {
                expression {
                    return env.GIT_BRANCH == "origin/production"
                }
            }
            steps {
                updateGitlabCommitStatus name: 'build', state: 'pending'
                sh label: 'Stop service', script: 'ssh -o StrictHostKeyChecking=no ubuntu@54.144.247.254 "sudo service chatbot-production stop"'
                sh label: 'Sync files', script: 'rsync -avz -e "ssh -o StrictHostKeyChecking=no"  --exclude-from=.rsyncignore ./ ubuntu@54.144.247.254:/home/ubuntu/chatbot_production'
                sh label: 'Install dependency', script: 'ssh -o StrictHostKeyChecking=no ubuntu@54.144.247.254 "cd /home/ubuntu/chatbot_production && npm i"'
                sh label: 'Run migration', script: 'ssh -o StrictHostKeyChecking=no ubuntu@54.144.247.254 "cd /home/ubuntu/chatbot_production && npm run start:migrate"'
                sh label: 'Start service', script: 'ssh -o StrictHostKeyChecking=no ubuntu@54.144.247.254 "sudo service chatbot-production start"'
                updateGitlabCommitStatus name: 'build', state: 'success'
            }
        }
    }
}

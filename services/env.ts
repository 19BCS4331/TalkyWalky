import Constants from 'expo-constants/src/Constants';

export const ENV = {
  ELEVENLABS_API_KEY: Constants.expoConfig?.extra?.ELEVENLABS_API_KEY || '',
  OPENAI_API_KEY: Constants.expoConfig?.extra?.OPENAI_API_KEY || '',
};

// Validate that all required environment variables are present
const validateEnv = () => {
  const requiredVars = ['ELEVENLABS_API_KEY','OPENAI_API_KEY'];
  const missingVars = requiredVars.filter(key => !ENV[key as keyof typeof ENV]);
  
  if (missingVars.length > 0) {
    console.warn(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

validateEnv();

export default ENV;

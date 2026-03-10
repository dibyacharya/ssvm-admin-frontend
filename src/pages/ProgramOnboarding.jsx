import React from 'react';
import { useParams } from 'react-router-dom';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';

const ProgramOnboarding = () => {
  const { programId } = useParams();
  return <OnboardingWizard editProgramId={programId || null} />;
};

export default ProgramOnboarding;

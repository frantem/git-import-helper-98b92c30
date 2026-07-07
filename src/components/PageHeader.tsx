import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  backPath?: string;
}

export function PageHeader({ title, backPath }: PageHeaderProps) {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };
  
  return (
    <div className="flex items-center gap-2 mb-4">
      <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9" aria-label="Назад">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
    </div>
  );
}

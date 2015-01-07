using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;


namespace CommonDataHelper.PublisherHelper.Model.FieldValidation
{
    public class TemplatePropertiesModel
    {
        [JsonProperty("code")]
        public DiagnosesModel code;

        [JsonProperty("description")]
        public DiagnosesModel description;
    }
}

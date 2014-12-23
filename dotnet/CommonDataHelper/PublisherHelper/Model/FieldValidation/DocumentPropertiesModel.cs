using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;


namespace CommonDataHelper.PublisherHelper.Model.FieldValidation
{
    public class DocumentPropertiesModel
    {
        [JsonProperty("description")]
        public DiagnosesModel description;
    }
}
